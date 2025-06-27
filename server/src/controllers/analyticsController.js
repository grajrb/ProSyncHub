const { sequelize } = require('../config/postgresConfig');
const { Asset, WorkOrder, AssetType, Plant, Location } = require('../models');
const AssetSensorReading = require('../models/mongodb/AssetSensorReading');
const mongoose = require('mongoose');
const winston = require('winston');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'analytics-controller' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'analytics-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'analytics.log' })
  ]
});

// Get asset status summary
const getAssetStatusSummary = async (req, res) => {
  try {
    const { plant_id } = req.query;
    
    // Build query conditions
    const whereCondition = plant_id ? { plant_id } : {};
    
    // Get status counts
    const statusCounts = await Asset.findAll({
      attributes: [
        'current_status',
        [sequelize.fn('COUNT', sequelize.col('asset_id')), 'count']
      ],
      where: whereCondition,
      group: ['current_status']
    });
    
    // Format result as object
    const statusSummary = {
      ONLINE: 0,
      OFFLINE: 0,
      MAINTENANCE: 0,
      ERROR: 0,
      WARNING: 0,
      total: 0
    };
    
    statusCounts.forEach(statusCount => {
      statusSummary[statusCount.current_status] = parseInt(statusCount.getDataValue('count'));
      statusSummary.total += parseInt(statusCount.getDataValue('count'));
    });
    
    res.status(200).json(statusSummary);
  } catch (error) {
    logger.error('Error getting asset status summary:', error);
    res.status(500).json({ error: 'Failed to get asset status summary' });
  }
};

// Get work order status summary
const getWorkOrderStatusSummary = async (req, res) => {
  try {
    const { plant_id, date_range } = req.query;
    
    // Build query conditions
    let whereCondition = {};
    
    if (plant_id) {
      whereCondition = {
        '$asset.plant_id$': plant_id
      };
    }
    
    if (date_range) {
      const today = new Date();
      let startDate;
      
      switch (date_range) {
        case 'week':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(today);
          startDate.setMonth(today.getMonth() - 1);
          break;
        case 'quarter':
          startDate = new Date(today);
          startDate.setMonth(today.getMonth() - 3);
          break;
        case 'year':
          startDate = new Date(today);
          startDate.setFullYear(today.getFullYear() - 1);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        whereCondition.created_at = {
          [Op.gte]: startDate
        };
      }
    }
    
    // Get status counts
    const statusCounts = await WorkOrder.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('work_order_id')), 'count']
      ],
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: []
        }
      ],
      where: whereCondition,
      group: ['status']
    });
    
    // Format result as object
    const statusSummary = {
      OPEN: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      total: 0
    };
    
    statusCounts.forEach(statusCount => {
      statusSummary[statusCount.status] = parseInt(statusCount.getDataValue('count'));
      statusSummary.total += parseInt(statusCount.getDataValue('count'));
    });
    
    res.status(200).json(statusSummary);
  } catch (error) {
    logger.error('Error getting work order status summary:', error);
    res.status(500).json({ error: 'Failed to get work order status summary' });
  }
};

// Get asset health overview
const getAssetHealthOverview = async (req, res) => {
  try {
    const { plant_id } = req.query;
    
    // Build query conditions
    const whereCondition = plant_id ? { plant_id } : {};
    
    // Get health score statistics
    const healthStats = await Asset.findAll({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('health_score')), 'avg_health'],
        [sequelize.fn('MIN', sequelize.col('health_score')), 'min_health'],
        [sequelize.fn('MAX', sequelize.col('health_score')), 'max_health'],
        [sequelize.fn('COUNT', sequelize.col('asset_id')), 'total_assets']
      ],
      where: whereCondition
    });
    
    // Get health score distribution
    const healthDistribution = await Asset.findAll({
      attributes: [
        [sequelize.literal(`
          CASE 
            WHEN health_score >= 90 THEN 'Excellent (90-100)'
            WHEN health_score >= 70 THEN 'Good (70-89)'
            WHEN health_score >= 50 THEN 'Fair (50-69)'
            WHEN health_score >= 30 THEN 'Poor (30-49)'
            ELSE 'Critical (0-29)'
          END
        `), 'health_category'],
        [sequelize.fn('COUNT', sequelize.col('asset_id')), 'count']
      ],
      where: whereCondition,
      group: ['health_category'],
      order: [[sequelize.literal('health_category'), 'DESC']]
    });
    
    // Format distribution as object
    const distribution = {
      'Excellent (90-100)': 0,
      'Good (70-89)': 0,
      'Fair (50-69)': 0,
      'Poor (30-49)': 0,
      'Critical (0-29)': 0
    };
    
    healthDistribution.forEach(category => {
      distribution[category.getDataValue('health_category')] = parseInt(category.getDataValue('count'));
    });
    
    // Build response
    const response = {
      statistics: {
        average_health: parseFloat(healthStats[0].getDataValue('avg_health') || 0).toFixed(1),
        minimum_health: parseInt(healthStats[0].getDataValue('min_health') || 0),
        maximum_health: parseInt(healthStats[0].getDataValue('max_health') || 0),
        total_assets: parseInt(healthStats[0].getDataValue('total_assets') || 0)
      },
      distribution
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting asset health overview:', error);
    res.status(500).json({ error: 'Failed to get asset health overview' });
  }
};

// Get work order statistics
const getWorkOrderStatistics = async (req, res) => {
  try {
    const { plant_id, time_period } = req.query;
    
    // Determine time period (default: month)
    const period = time_period || 'month';
    const dateFormat = period === 'day' ? 'YYYY-MM-DD' : 
                      period === 'week' ? 'YYYY-WW' : 
                      period === 'month' ? 'YYYY-MM' : 'YYYY';
    
    // Build query conditions
    let whereCondition = {};
    
    if (plant_id) {
      whereCondition = {
        '$asset.plant_id$': plant_id
      };
    }
    
    // Get work order creation statistics by time period
    const creationStats = await WorkOrder.findAll({
      attributes: [
        [sequelize.fn('DATE_TRUNC', period, sequelize.col('created_at')), 'period'],
        [sequelize.fn('COUNT', sequelize.col('work_order_id')), 'count']
      ],
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: []
        }
      ],
      where: whereCondition,
      group: ['period'],
      order: [[sequelize.literal('period'), 'ASC']]
    });
    
    // Get work order completion statistics by time period
    const completionStats = await WorkOrder.findAll({
      attributes: [
        [sequelize.fn('DATE_TRUNC', period, sequelize.col('completed_at')), 'period'],
        [sequelize.fn('COUNT', sequelize.col('work_order_id')), 'count']
      ],
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: []
        }
      ],
      where: {
        ...whereCondition,
        status: 'COMPLETED',
        completed_at: { [Op.not]: null }
      },
      group: ['period'],
      order: [[sequelize.literal('period'), 'ASC']]
    });
    
    // Get work order type distribution
    const typeDistribution = await WorkOrder.findAll({
      attributes: [
        'work_order_type',
        [sequelize.fn('COUNT', sequelize.col('work_order_id')), 'count']
      ],
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: []
        }
      ],
      where: whereCondition,
      group: ['work_order_type'],
      order: [[sequelize.fn('COUNT', sequelize.col('work_order_id')), 'DESC']]
    });
    
    // Get work order average completion time
    const avgCompletionTime = await WorkOrder.findAll({
      attributes: [
        [sequelize.fn('AVG', 
          sequelize.literal('EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600')
        ), 'avg_hours']
      ],
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: []
        }
      ],
      where: {
        ...whereCondition,
        status: 'COMPLETED',
        completed_at: { [Op.not]: null }
      }
    });
    
    // Format creation stats
    const creationData = {};
    creationStats.forEach(stat => {
      const periodKey = stat.getDataValue('period').toISOString().split('T')[0];
      creationData[periodKey] = parseInt(stat.getDataValue('count'));
    });
    
    // Format completion stats
    const completionData = {};
    completionStats.forEach(stat => {
      if (stat.getDataValue('period')) {
        const periodKey = stat.getDataValue('period').toISOString().split('T')[0];
        completionData[periodKey] = parseInt(stat.getDataValue('count'));
      }
    });
    
    // Format type distribution
    const typeData = {};
    typeDistribution.forEach(type => {
      typeData[type.work_order_type] = parseInt(type.getDataValue('count'));
    });
    
    // Build response
    const response = {
      time_series: {
        period,
        creation: creationData,
        completion: completionData
      },
      type_distribution: typeData,
      avg_completion_time_hours: parseFloat(avgCompletionTime[0].getDataValue('avg_hours') || 0).toFixed(1)
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting work order statistics:', error);
    res.status(500).json({ error: 'Failed to get work order statistics' });
  }
};

// Get asset performance metrics
const getAssetPerformanceMetrics = async (req, res) => {
  try {
    const { asset_id, time_period, metric_type } = req.query;
    
    if (!asset_id) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }
    
    // Determine time period (default: day)
    const period = time_period || 'day';
    let timeGroup;
    
    switch (period) {
      case 'hour':
        timeGroup = { $dateToString: { format: "%Y-%m-%d-%H", date: "$timestamp" } };
        break;
      case 'day':
        timeGroup = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
        break;
      case 'week':
        timeGroup = { 
          $dateToString: { 
            format: "%Y-W%U", 
            date: "$timestamp" 
          } 
        };
        break;
      case 'month':
        timeGroup = { $dateToString: { format: "%Y-%m", date: "$timestamp" } };
        break;
      default:
        timeGroup = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
    }
    
    // Build aggregation query
    const matchQuery = { asset_id };
    
    if (metric_type) {
      matchQuery.sensor_type = metric_type;
    }
    
    const aggregationPipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: {
            time_period: timeGroup,
            sensor_type: "$sensor_type"
          },
          avg_value: { $avg: "$value" },
          min_value: { $min: "$value" },
          max_value: { $max: "$value" },
          count: { $sum: 1 }
        }
      },
      { 
        $sort: { 
          "_id.time_period": 1,
          "_id.sensor_type": 1
        } 
      }
    ];
    
    // Execute aggregation
    const sensorData = await AssetSensorReading.aggregate(aggregationPipeline);
    
    // Format results by sensor type
    const metrics = {};
    
    sensorData.forEach(data => {
      const sensorType = data._id.sensor_type;
      const timePeriod = data._id.time_period;
      
      if (!metrics[sensorType]) {
        metrics[sensorType] = {
          time_periods: [],
          avg_values: [],
          min_values: [],
          max_values: []
        };
      }
      
      metrics[sensorType].time_periods.push(timePeriod);
      metrics[sensorType].avg_values.push(parseFloat(data.avg_value.toFixed(2)));
      metrics[sensorType].min_values.push(parseFloat(data.min_value.toFixed(2)));
      metrics[sensorType].max_values.push(parseFloat(data.max_value.toFixed(2)));
    });
    
    // Get asset details
    const asset = await Asset.findByPk(asset_id, {
      attributes: ['asset_id', 'name', 'asset_tag']
    });
    
    // Build response
    const response = {
      asset: asset || { asset_id },
      time_period: period,
      metrics
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting asset performance metrics:', error);
    res.status(500).json({ error: 'Failed to get asset performance metrics' });
  }
};

// Get maintenance cost analysis
const getMaintenanceCostAnalysis = async (req, res) => {
  try {
    const { plant_id, time_period, asset_type_id } = req.query;
    
    // Determine time period (default: month)
    const period = time_period || 'month';
    const dateFormat = period === 'day' ? 'YYYY-MM-DD' : 
                      period === 'week' ? 'YYYY-WW' : 
                      period === 'month' ? 'YYYY-MM' : 'YYYY';
    
    // Build query conditions
    let whereCondition = {};
    let assetWhereCondition = {};
    
    if (plant_id) {
      whereCondition['$asset.plant_id$'] = plant_id;
      assetWhereCondition.plant_id = plant_id;
    }
    
    if (asset_type_id) {
      whereCondition['$asset.asset_type_id$'] = asset_type_id;
      assetWhereCondition.asset_type_id = asset_type_id;
    }
    
    // Get cost by time period
    const costByPeriod = await WorkOrder.findAll({
      attributes: [
        [sequelize.fn('DATE_TRUNC', period, sequelize.col('created_at')), 'period'],
        [sequelize.fn('SUM', sequelize.col('actual_cost')), 'total_cost'],
        [sequelize.fn('COUNT', sequelize.col('work_order_id')), 'work_order_count']
      ],
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: []
        }
      ],
      where: {
        ...whereCondition,
        actual_cost: { [Op.not]: null }
      },
      group: ['period'],
      order: [[sequelize.literal('period'), 'ASC']]
    });
    
    // Get cost by asset type
    const costByAssetType = await WorkOrder.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('actual_cost')), 'total_cost'],
        [sequelize.fn('COUNT', sequelize.col('work_order_id')), 'work_order_count']
      ],
      include: [
        {
          model: Asset,
          as: 'asset',
          include: [
            {
              model: AssetType,
              as: 'asset_type',
              attributes: ['asset_type_id', 'name']
            }
          ],
          attributes: []
        }
      ],
      where: {
        ...whereCondition,
        actual_cost: { [Op.not]: null }
      },
      group: ['asset.asset_type.asset_type_id', 'asset.asset_type.name'],
      order: [[sequelize.literal('total_cost'), 'DESC']]
    });
    
    // Get cost by work order type
    const costByWorkOrderType = await WorkOrder.findAll({
      attributes: [
        'work_order_type',
        [sequelize.fn('SUM', sequelize.col('actual_cost')), 'total_cost'],
        [sequelize.fn('COUNT', sequelize.col('work_order_id')), 'work_order_count']
      ],
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: []
        }
      ],
      where: {
        ...whereCondition,
        actual_cost: { [Op.not]: null }
      },
      group: ['work_order_type'],
      order: [[sequelize.literal('total_cost'), 'DESC']]
    });
    
    // Get total asset value
    const assetValue = await Asset.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('purchase_cost')), 'total_value'],
        [sequelize.fn('COUNT', sequelize.col('asset_id')), 'asset_count']
      ],
      where: assetWhereCondition
    });
    
    // Format cost by period
    const periodData = {};
    costByPeriod.forEach(data => {
      const periodKey = data.getDataValue('period').toISOString().split('T')[0];
      periodData[periodKey] = {
        cost: parseFloat(data.getDataValue('total_cost') || 0),
        count: parseInt(data.getDataValue('work_order_count') || 0)
      };
    });
    
    // Format cost by asset type
    const assetTypeData = [];
    costByAssetType.forEach(data => {
      const assetType = data.asset.asset_type;
      assetTypeData.push({
        asset_type_id: assetType.asset_type_id,
        name: assetType.name,
        total_cost: parseFloat(data.getDataValue('total_cost') || 0),
        work_order_count: parseInt(data.getDataValue('work_order_count') || 0)
      });
    });
    
    // Format cost by work order type
    const workOrderTypeData = {};
    costByWorkOrderType.forEach(data => {
      workOrderTypeData[data.work_order_type] = {
        cost: parseFloat(data.getDataValue('total_cost') || 0),
        count: parseInt(data.getDataValue('work_order_count') || 0)
      };
    });
    
    // Calculate total maintenance cost
    let totalMaintenanceCost = 0;
    Object.values(periodData).forEach(period => {
      totalMaintenanceCost += period.cost;
    });
    
    // Build response
    const response = {
      time_period: period,
      total_maintenance_cost: totalMaintenanceCost,
      total_asset_value: parseFloat(assetValue[0].getDataValue('total_value') || 0),
      asset_count: parseInt(assetValue[0].getDataValue('asset_count') || 0),
      maintenance_to_asset_value_ratio: totalMaintenanceCost === 0 || !assetValue[0].getDataValue('total_value') 
        ? 0 
        : (totalMaintenanceCost / parseFloat(assetValue[0].getDataValue('total_value')) * 100).toFixed(2),
      cost_by_period: periodData,
      cost_by_asset_type: assetTypeData,
      cost_by_work_order_type: workOrderTypeData
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting maintenance cost analysis:', error);
    res.status(500).json({ error: 'Failed to get maintenance cost analysis' });
  }
};

// Get predictive maintenance insights
const getPredictiveInsights = async (req, res) => {
  try {
    const { asset_id, threshold = 70 } = req.query;
    
    // If asset_id is provided, get insights for specific asset
    if (asset_id) {
      // Get asset details
      const asset = await Asset.findByPk(asset_id, {
        include: [
          { model: AssetType, as: 'asset_type' },
          { model: Location, as: 'location' }
        ]
      });
      
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      // Get recent sensor readings
      const recentReadings = await AssetSensorReading.find({ asset_id })
        .sort({ timestamp: -1 })
        .limit(100);
      
      // Get recent work orders
      const recentWorkOrders = await WorkOrder.findAll({
        where: { asset_id },
        order: [['created_at', 'DESC']],
        limit: 5
      });
      
      // Basic rule-based analysis
      const healthScore = asset.health_score;
      const maintenanceRecommendation = healthScore < threshold;
      
      // Analyze sensor readings (basic anomaly detection)
      const sensorTypes = [...new Set(recentReadings.map(reading => reading.sensor_type))];
      const sensorAnomalies = [];
      
      for (const sensorType of sensorTypes) {
        const typeReadings = recentReadings.filter(reading => reading.sensor_type === sensorType);
        
        if (typeReadings.length > 10) {
          // Calculate mean and standard deviation
          const values = typeReadings.map(reading => reading.value);
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
          
          // Check for anomalies (values outside 2 standard deviations)
          const recentValue = typeReadings[0].value;
          const zScore = (recentValue - mean) / stdDev;
          
          if (Math.abs(zScore) > 2) {
            sensorAnomalies.push({
              sensor_type: sensorType,
              current_value: recentValue,
              unit: typeReadings[0].unit,
              mean_value: parseFloat(mean.toFixed(2)),
              std_dev: parseFloat(stdDev.toFixed(2)),
              z_score: parseFloat(zScore.toFixed(2)),
              is_high: zScore > 0,
              timestamp: typeReadings[0].timestamp
            });
          }
        }
      }
      
      // Build response
      const response = {
        asset: {
          asset_id: asset.asset_id,
          name: asset.name,
          asset_tag: asset.asset_tag,
          health_score: asset.health_score,
          asset_type: asset.asset_type ? asset.asset_type.name : null,
          location: asset.location ? asset.location.name : null
        },
        maintenance_required: maintenanceRecommendation,
        reason: maintenanceRecommendation 
          ? `Asset health score (${healthScore}) is below threshold (${threshold})`
          : null,
        sensor_anomalies: sensorAnomalies,
        recent_work_orders: recentWorkOrders.map(wo => ({
          work_order_id: wo.work_order_id,
          title: wo.title,
          status: wo.status,
          created_at: wo.created_at
        }))
      };
      
      res.status(200).json(response);
    } else {
      // Get insights for all assets below threshold
      const assetsAtRisk = await Asset.findAll({
        where: {
          health_score: { [Op.lt]: threshold }
        },
        include: [
          { model: AssetType, as: 'asset_type' },
          { model: Location, as: 'location' },
          { model: Plant, as: 'plant' }
        ],
        order: [['health_score', 'ASC']]
      });
      
      // Get current open work orders for these assets
      const assetIds = assetsAtRisk.map(asset => asset.asset_id);
      const openWorkOrders = await WorkOrder.findAll({
        where: {
          asset_id: { [Op.in]: assetIds },
          status: { [Op.in]: ['OPEN', 'IN_PROGRESS'] }
        }
      });
      
      // Group work orders by asset
      const workOrdersByAsset = {};
      openWorkOrders.forEach(wo => {
        if (!workOrdersByAsset[wo.asset_id]) {
          workOrdersByAsset[wo.asset_id] = [];
        }
        workOrdersByAsset[wo.asset_id].push(wo);
      });
      
      // Build response
      const assets = assetsAtRisk.map(asset => ({
        asset_id: asset.asset_id,
        name: asset.name,
        asset_tag: asset.asset_tag,
        health_score: asset.health_score,
        current_status: asset.current_status,
        asset_type: asset.asset_type ? asset.asset_type.name : null,
        location: asset.location ? asset.location.name : null,
        plant: asset.plant ? asset.plant.name : null,
        has_open_work_orders: workOrdersByAsset[asset.asset_id] ? true : false,
        open_work_order_count: workOrdersByAsset[asset.asset_id] ? workOrdersByAsset[asset.asset_id].length : 0
      }));
      
      const response = {
        threshold,
        assets_at_risk_count: assets.length,
        assets_at_risk: assets
      };
      
      res.status(200).json(response);
    }
  } catch (error) {
    logger.error('Error getting predictive maintenance insights:', error);
    res.status(500).json({ error: 'Failed to get predictive maintenance insights' });
  }
};

module.exports = {
  getAssetStatusSummary,
  getWorkOrderStatusSummary,
  getAssetHealthOverview,
  getWorkOrderStatistics,
  getAssetPerformanceMetrics,
  getMaintenanceCostAnalysis,
  getPredictiveInsights
};
