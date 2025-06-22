const { Asset, WorkOrder } = require('../models');
const AssetSensorReading = require('../models/mongodb/AssetSensorReading');
const AssetEventLog = require('../models/mongodb/AssetEventLog');
const winston = require('winston');
const { Op } = require('sequelize');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'predictive-controller' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'predictive-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'predictive.log' })
  ]
});

// Analyze asset health and detect anomalies
const analyzeAssetHealth = async (req, res) => {
  try {
    const { asset_id } = req.params;
    
    // Find asset
    const asset = await Asset.findByPk(asset_id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Get latest sensor readings
    const sensorReadings = await AssetSensorReading.find({ asset_id })
      .sort({ timestamp: -1 })
      .limit(1000);
    
    // Group readings by sensor type
    const readingsByType = {};
    sensorReadings.forEach(reading => {
      if (!readingsByType[reading.sensor_type]) {
        readingsByType[reading.sensor_type] = [];
      }
      readingsByType[reading.sensor_type].push(reading);
    });
    
    // Analyze each sensor type
    const anomalies = [];
    const insights = {};
    
    for (const [sensorType, readings] of Object.entries(readingsByType)) {
      if (readings.length < 10) continue; // Skip if not enough data
      
      // Get sensor values
      const values = readings.map(r => r.value);
      
      // Calculate statistics
      const stats = calculateStatistics(values);
      
      // Store statistics
      insights[sensorType] = {
        unit: readings[0].unit,
        current_value: readings[0].value,
        mean: stats.mean,
        median: stats.median,
        std_dev: stats.stdDev,
        min: stats.min,
        max: stats.max,
        trend: calculateTrend(readings)
      };
      
      // Check for anomalies
      const latestReading = readings[0];
      const zScore = (latestReading.value - stats.mean) / stats.stdDev;
      
      if (Math.abs(zScore) > 2) {
        anomalies.push({
          sensor_type: sensorType,
          value: latestReading.value,
          unit: latestReading.unit,
          timestamp: latestReading.timestamp,
          z_score: zScore,
          deviation: `${(zScore > 0 ? 'above' : 'below')} normal range`,
          severity: Math.abs(zScore) > 3 ? 'high' : 'medium'
        });
      }
    }
    
    // Calculate overall health score based on anomalies
    let healthScore = 100;
    
    // Reduce score for each anomaly based on severity
    anomalies.forEach(anomaly => {
      if (anomaly.severity === 'high') {
        healthScore -= 15;
      } else {
        healthScore -= 7;
      }
    });
    
    // Ensure health score stays in range 0-100
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    // Get recent work orders
    const recentWorkOrders = await WorkOrder.findAll({
      where: { asset_id },
      order: [['created_at', 'DESC']],
      limit: 5
    });
    
    // Get maintenance history
    const maintenanceHistory = await AssetEventLog.find({
      asset_id,
      event_type: { $in: ['MAINTENANCE', 'WORK_ORDER_COMPLETED'] }
    })
      .sort({ timestamp: -1 })
      .limit(10);
    
    // Generate maintenance recommendations
    let maintenanceRecommendation = null;
    let recommendationReason = null;
    
    if (healthScore < 50) {
      maintenanceRecommendation = 'urgent';
      recommendationReason = 'Multiple critical sensor anomalies detected';
    } else if (healthScore < 70) {
      maintenanceRecommendation = 'scheduled';
      recommendationReason = 'Sensor readings showing signs of deterioration';
    } else if (healthScore < 85) {
      maintenanceRecommendation = 'monitoring';
      recommendationReason = 'Minor anomalies detected, increased monitoring recommended';
    }
    
    // Update asset health score in database if it changed significantly
    if (Math.abs(asset.health_score - healthScore) > 5) {
      await asset.update({
        health_score: healthScore,
        updated_by: req.user.user_id
      });
      
      // Log health score change
      await AssetEventLog.create({
        asset_id,
        event_type: 'HEALTH_SCORE_UPDATED',
        description: `Asset health score updated to ${healthScore}`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        metadata: { 
          previous_score: asset.health_score,
          new_score: healthScore,
          anomalies: anomalies.length
        }
      });
    }
    
    // Prepare response
    const response = {
      asset_id: asset.asset_id,
      name: asset.name,
      asset_tag: asset.asset_tag,
      health_score: healthScore,
      previous_health_score: asset.health_score,
      sensor_insights: insights,
      anomalies,
      maintenance_recommendation: maintenanceRecommendation,
      recommendation_reason: recommendationReason,
      recent_work_orders: recentWorkOrders.map(wo => ({
        work_order_id: wo.work_order_id,
        title: wo.title,
        status: wo.status,
        created_at: wo.created_at
      })),
      maintenance_history: maintenanceHistory.map(event => ({
        event_type: event.event_type,
        description: event.description,
        timestamp: event.timestamp
      }))
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error(`Error analyzing asset health for asset ID ${req.params.asset_id}:`, error);
    res.status(500).json({ error: 'Failed to analyze asset health' });
  }
};

// Run predictive maintenance scan for all assets
const runPredictiveScan = async (req, res) => {
  try {
    const { plant_id, threshold = 70 } = req.query;
    
    // Build query conditions
    const whereCondition = plant_id ? { plant_id } : {};
    
    // Get all assets
    const assets = await Asset.findAll({
      where: whereCondition,
      attributes: ['asset_id', 'name', 'asset_tag', 'health_score', 'current_status']
    });
    
    // Track scan results
    const results = {
      total_assets: assets.length,
      assets_analyzed: 0,
      assets_at_risk: 0,
      assets_with_anomalies: 0,
      assets_requiring_maintenance: 0,
      at_risk_assets: []
    };
    
    // Analyze each asset
    for (const asset of assets) {
      // Get latest sensor readings
      const sensorReadings = await AssetSensorReading.find({ asset_id: asset.asset_id })
        .sort({ timestamp: -1 })
        .limit(100);
      
      if (sensorReadings.length === 0) {
        results.assets_analyzed++;
        continue; // Skip assets with no sensor data
      }
      
      // Group readings by sensor type
      const readingsByType = {};
      sensorReadings.forEach(reading => {
        if (!readingsByType[reading.sensor_type]) {
          readingsByType[reading.sensor_type] = [];
        }
        readingsByType[reading.sensor_type].push(reading);
      });
      
      // Analyze each sensor type
      const anomalies = [];
      
      for (const [sensorType, readings] of Object.entries(readingsByType)) {
        if (readings.length < 10) continue; // Skip if not enough data
        
        // Get sensor values
        const values = readings.map(r => r.value);
        
        // Calculate statistics
        const stats = calculateStatistics(values);
        
        // Check for anomalies
        const latestReading = readings[0];
        const zScore = (latestReading.value - stats.mean) / stats.stdDev;
        
        if (Math.abs(zScore) > 2) {
          anomalies.push({
            sensor_type: sensorType,
            value: latestReading.value,
            unit: latestReading.unit,
            z_score: zScore,
            severity: Math.abs(zScore) > 3 ? 'high' : 'medium'
          });
        }
      }
      
      // Calculate health score based on anomalies
      let healthScore = 100;
      
      // Reduce score for each anomaly based on severity
      anomalies.forEach(anomaly => {
        if (anomaly.severity === 'high') {
          healthScore -= 15;
        } else {
          healthScore -= 7;
        }
      });
      
      // Ensure health score stays in range 0-100
      healthScore = Math.max(0, Math.min(100, healthScore));
      
      // Update asset if health score changed significantly
      if (Math.abs(asset.health_score - healthScore) > 5) {
        await asset.update({
          health_score: healthScore,
          updated_by: req.user.user_id
        });
        
        // Log health score change
        await AssetEventLog.create({
          asset_id: asset.asset_id,
          event_type: 'HEALTH_SCORE_UPDATED',
          description: `Asset health score updated to ${healthScore} by predictive scan`,
          user_id: req.user.user_id,
          user_name: `${req.user.first_name} ${req.user.last_name}`,
          metadata: { 
            previous_score: asset.health_score,
            new_score: healthScore,
            anomalies: anomalies.length
          }
        });
      }
      
      // Determine if asset requires maintenance
      const requiresMaintenance = healthScore < threshold;
      
      // Update counters
      results.assets_analyzed++;
      
      if (anomalies.length > 0) {
        results.assets_with_anomalies++;
      }
      
      if (requiresMaintenance) {
        results.assets_at_risk++;
        results.assets_requiring_maintenance++;
        
        // Get existing work orders
        const existingWorkOrders = await WorkOrder.findOne({
          where: {
            asset_id: asset.asset_id,
            status: { [Op.in]: ['OPEN', 'IN_PROGRESS'] },
            work_order_type: 'PREDICTIVE'
          }
        });
        
        // Check if a maintenance work order already exists
        const hasWorkOrder = existingWorkOrders !== null;
        
        // Add to at-risk assets
        results.at_risk_assets.push({
          asset_id: asset.asset_id,
          name: asset.name,
          asset_tag: asset.asset_tag,
          health_score: healthScore,
          anomaly_count: anomalies.length,
          has_open_work_order: hasWorkOrder,
          maintenance_recommendation: healthScore < 50 
            ? 'urgent' 
            : healthScore < 70 
              ? 'scheduled' 
              : 'monitoring'
        });
      }
    }
    
    // Log scan completion
    await AssetEventLog.create({
      event_type: 'PREDICTIVE_SCAN_COMPLETED',
      description: `Predictive maintenance scan completed for ${results.assets_analyzed} assets`,
      user_id: req.user.user_id,
      user_name: `${req.user.first_name} ${req.user.last_name}`,
      metadata: { 
        assets_analyzed: results.assets_analyzed,
        assets_at_risk: results.assets_at_risk,
        assets_with_anomalies: results.assets_with_anomalies,
        threshold
      }
    });
    
    res.status(200).json(results);
  } catch (error) {
    logger.error('Error running predictive maintenance scan:', error);
    res.status(500).json({ error: 'Failed to run predictive maintenance scan' });
  }
};

// Generate maintenance work orders based on predictive scan
const generateMaintenanceWorkOrders = async (req, res) => {
  try {
    const { threshold = 50, asset_ids } = req.body;
    
    // Determine which assets to process
    let assetsToProcess;
    
    if (asset_ids && asset_ids.length > 0) {
      // Use specific asset IDs
      assetsToProcess = await Asset.findAll({
        where: {
          asset_id: { [Op.in]: asset_ids }
        }
      });
    } else {
      // Use health score threshold
      assetsToProcess = await Asset.findAll({
        where: {
          health_score: { [Op.lt]: threshold }
        }
      });
    }
    
    if (assetsToProcess.length === 0) {
      return res.status(200).json({ 
        message: 'No assets require maintenance work orders',
        assets_processed: 0,
        work_orders_created: 0
      });
    }
    
    // Track results
    const results = {
      assets_processed: assetsToProcess.length,
      work_orders_created: 0,
      work_orders_already_exist: 0,
      work_orders: []
    };
    
    // Process each asset
    for (const asset of assetsToProcess) {
      // Check if an open predictive maintenance work order already exists
      const existingWorkOrder = await WorkOrder.findOne({
        where: {
          asset_id: asset.asset_id,
          status: { [Op.in]: ['OPEN', 'IN_PROGRESS'] },
          work_order_type: 'PREDICTIVE'
        }
      });
      
      if (existingWorkOrder) {
        results.work_orders_already_exist++;
        continue;
      }
      
      // Get recent anomalies
      const recentReadings = await AssetSensorReading.find({ asset_id: asset.asset_id })
        .sort({ timestamp: -1 })
        .limit(50);
      
      // Group readings by sensor type
      const readingsByType = {};
      recentReadings.forEach(reading => {
        if (!readingsByType[reading.sensor_type]) {
          readingsByType[reading.sensor_type] = [];
        }
        readingsByType[reading.sensor_type].push(reading);
      });
      
      // Analyze each sensor type for anomalies
      const anomalies = [];
      
      for (const [sensorType, readings] of Object.entries(readingsByType)) {
        if (readings.length < 10) continue;
        
        // Get sensor values
        const values = readings.map(r => r.value);
        
        // Calculate statistics
        const stats = calculateStatistics(values);
        
        // Check for anomalies
        const latestReading = readings[0];
        const zScore = (latestReading.value - stats.mean) / stats.stdDev;
        
        if (Math.abs(zScore) > 2) {
          anomalies.push({
            sensor_type: sensorType,
            value: latestReading.value,
            unit: latestReading.unit,
            deviation: `${(zScore > 0 ? 'above' : 'below')} normal range by ${Math.abs(zScore).toFixed(1)} standard deviations`
          });
        }
      }
      
      // Generate work order
      const workOrderTitle = `Predictive Maintenance - ${asset.name}`;
      
      let workOrderDescription = `Predictive maintenance required for asset ${asset.name} (${asset.asset_tag}).\n\n`;
      workOrderDescription += `Current health score: ${asset.health_score}\n\n`;
      
      if (anomalies.length > 0) {
        workOrderDescription += 'Detected anomalies:\n';
        anomalies.forEach(anomaly => {
          workOrderDescription += `- ${anomaly.sensor_type}: ${anomaly.value} ${anomaly.unit} (${anomaly.deviation})\n`;
        });
      }
      
      // Create work order
      const newWorkOrder = await WorkOrder.create({
        title: workOrderTitle,
        description: workOrderDescription,
        work_order_type: 'PREDICTIVE',
        priority: asset.health_score < 50 ? 'HIGH' : 'MEDIUM',
        status: 'OPEN',
        asset_id: asset.asset_id,
        due_date: new Date(Date.now() + (asset.health_score < 50 ? 86400000 : 604800000)), // 1 day or 1 week
        estimated_hours: 2,
        created_by: req.user.user_id
      });
      
      // Create work order event log
      await AssetEventLog.create({
        asset_id: asset.asset_id,
        event_type: 'WORK_ORDER_CREATED',
        description: `Predictive maintenance work order created: ${workOrderTitle}`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        related_id: newWorkOrder.work_order_id,
        related_type: 'work_order'
      });
      
      // Update results
      results.work_orders_created++;
      results.work_orders.push({
        work_order_id: newWorkOrder.work_order_id,
        title: newWorkOrder.title,
        asset_id: asset.asset_id,
        asset_name: asset.name,
        priority: newWorkOrder.priority,
        due_date: newWorkOrder.due_date
      });
    }
    
    res.status(200).json(results);
  } catch (error) {
    logger.error('Error generating maintenance work orders:', error);
    res.status(500).json({ error: 'Failed to generate maintenance work orders' });
  }
};

// Helper function to calculate statistics
function calculateStatistics(values) {
  // Mean
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  // Standard deviation
  const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Median
  const sortedValues = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sortedValues.length / 2);
  const median = sortedValues.length % 2 === 0
    ? (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2
    : sortedValues[midpoint];
  
  // Min and max
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return {
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2))
  };
}

// Helper function to calculate trend
function calculateTrend(readings) {
  if (readings.length < 10) return 'insufficient_data';
  
  // Get 10 most recent readings
  const recentReadings = readings.slice(0, 10);
  
  // Sort by timestamp ascending
  recentReadings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  // Extract values
  const values = recentReadings.map(r => r.value);
  
  // Calculate simple linear regression
  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  
  const sumX = indices.reduce((sum, val) => sum + val, 0);
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = indices.reduce((sum, i) => sum + (i * values[i]), 0);
  const sumXX = indices.reduce((sum, i) => sum + (i * i), 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Determine trend based on slope
  if (Math.abs(slope) < 0.1) return 'stable';
  return slope > 0 ? 'increasing' : 'decreasing';
}

module.exports = {
  analyzeAssetHealth,
  runPredictiveScan,
  generateMaintenanceWorkOrders
};
