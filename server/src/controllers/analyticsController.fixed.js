// This is a fixed version of the analytics controller

const { sequelize, Op } = require('sequelize');
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

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
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
    const assetStatusSummary = {
      ONLINE: 0,
      OFFLINE: 0,
      MAINTENANCE: 0,
      ERROR: 0,
      WARNING: 0,
      total: 0
    };
    
    statusCounts.forEach(statusCount => {
      assetStatusSummary[statusCount.current_status] = parseInt(statusCount.getDataValue('count'));
      assetStatusSummary.total += parseInt(statusCount.getDataValue('count'));
    });
    
    // Get work order counts
    const workOrderCounts = await WorkOrder.findAll({
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
      where: plant_id ? { '$asset.plant_id$': plant_id } : {},
      group: ['status']
    });
    
    // Format result as object
    const workOrderStatusSummary = {
      OPEN: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      total: 0
    };
    
    workOrderCounts.forEach(statusCount => {
      workOrderStatusSummary[statusCount.status] = parseInt(statusCount.getDataValue('count'));
      workOrderStatusSummary.total += parseInt(statusCount.getDataValue('count'));
    });
    
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
    
    const healthOverview = {
      average_health: parseFloat(healthStats[0].getDataValue('avg_health') || 0).toFixed(1),
      minimum_health: parseInt(healthStats[0].getDataValue('min_health') || 0),
      maximum_health: parseInt(healthStats[0].getDataValue('max_health') || 0),
      total_assets: parseInt(healthStats[0].getDataValue('total_assets') || 0)
    };
    
    res.status(200).json({
      asset_status: assetStatusSummary,
      work_order_status: workOrderStatusSummary,
      health_overview: healthOverview
    });
  } catch (error) {
    logger.error('Error getting dashboard statistics:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
};

// Get asset health trends
const getAssetHealthTrends = async (req, res) => {
  try {
    const { plant_id, time_period } = req.query;
    
    // Determine time period (default: month)
    const period = time_period || 'month';
    
    // Build query conditions
    const whereCondition = plant_id ? { plant_id } : {};
    
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
      distribution,
      time_period: period
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting asset health trends:', error);
    res.status(500).json({ error: 'Failed to get asset health trends' });
  }
};

// Get work order statistics
const getWorkOrderStats = async (req, res) => {
  try {
    const { plant_id, time_period } = req.query;
    
    // Determine time period (default: month)
    const period = time_period || 'month';
    
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
      type_distribution: typeData
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting work order statistics:', error);
    res.status(500).json({ error: 'Failed to get work order statistics' });
  }
};

// Get maintenance efficiency metrics
const getMaintenanceEfficiency = async (req, res) => {
  try {
    const { plant_id, time_period } = req.query;
    
    // Determine time period (default: month)
    const period = time_period || 'month';
    
    // Build query conditions
    let whereCondition = {};
    
    if (plant_id) {
      whereCondition = {
        '$asset.plant_id$': plant_id
      };
    }
    
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
    
    // Get on-time completion rate
    const totalCompleted = await WorkOrder.count({
      where: {
        ...whereCondition,
        status: 'COMPLETED'
      }
    });
    
    const completedOnTime = await WorkOrder.count({
      where: {
        ...whereCondition,
        status: 'COMPLETED',
        completed_at: {
          [Op.not]: null,
          [Op.lte]: sequelize.col('due_date')
        }
      }
    });
    
    const onTimeRate = totalCompleted > 0 ? (completedOnTime / totalCompleted * 100).toFixed(1) : 0;
    
    // Build response
    const response = {
      time_period: period,
      avg_completion_time_hours: parseFloat(avgCompletionTime[0].getDataValue('avg_hours') || 0).toFixed(1),
      on_time_completion_rate: parseFloat(onTimeRate),
      total_completed: totalCompleted,
      completed_on_time: completedOnTime
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting maintenance efficiency metrics:', error);
    res.status(500).json({ error: 'Failed to get maintenance efficiency metrics' });
  }
};

// Get asset uptime statistics
const getAssetUptime = async (req, res) => {
  try {
    const { plant_id, asset_id, time_period } = req.query;
    
    // Determine time period (default: month)
    const period = time_period || 'month';
    
    // Build query conditions
    let whereCondition = {};
    
    if (plant_id) {
      whereCondition.plant_id = plant_id;
    }
    
    if (asset_id) {
      whereCondition.asset_id = asset_id;
    }
    
    // Get assets with uptime data
    const assets = await Asset.findAll({
      where: whereCondition,
      attributes: ['asset_id', 'name', 'uptime_percentage', 'last_downtime', 'current_status'],
      order: [['uptime_percentage', 'DESC']]
    });
    
    // Build response
    const response = {
      time_period: period,
      assets: assets.map(asset => ({
        asset_id: asset.asset_id,
        name: asset.name,
        uptime_percentage: asset.uptime_percentage,
        last_downtime: asset.last_downtime,
        current_status: asset.current_status,
        is_online: asset.current_status === 'ONLINE'
      }))
    };
    
    // Calculate averages
    if (assets.length > 0) {
      const totalUptime = assets.reduce((sum, asset) => sum + asset.uptime_percentage, 0);
      const avgUptime = (totalUptime / assets.length).toFixed(1);
      const onlineCount = assets.filter(asset => asset.current_status === 'ONLINE').length;
      const availabilityRate = (onlineCount / assets.length * 100).toFixed(1);
      
      response.summary = {
        total_assets: assets.length,
        average_uptime: parseFloat(avgUptime),
        availability_rate: parseFloat(availabilityRate),
        online_count: onlineCount,
        offline_count: assets.length - onlineCount
      };
    } else {
      response.summary = {
        total_assets: 0,
        average_uptime: 0,
        availability_rate: 0,
        online_count: 0,
        offline_count: 0
      };
    }
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting asset uptime statistics:', error);
    res.status(500).json({ error: 'Failed to get asset uptime statistics' });
  }
};

// Get sensor data trends
const getSensorTrends = async (req, res) => {
  try {
    const { asset_id, sensor_type, time_period } = req.query;
    
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
    
    if (sensor_type) {
      matchQuery.sensor_type = sensor_type;
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
    const trends = {};
    
    sensorData.forEach(data => {
      const sensorType = data._id.sensor_type;
      const timePeriod = data._id.time_period;
      
      if (!trends[sensorType]) {
        trends[sensorType] = {
          time_periods: [],
          avg_values: [],
          min_values: [],
          max_values: []
        };
      }
      
      trends[sensorType].time_periods.push(timePeriod);
      trends[sensorType].avg_values.push(parseFloat(data.avg_value.toFixed(2)));
      trends[sensorType].min_values.push(parseFloat(data.min_value.toFixed(2)));
      trends[sensorType].max_values.push(parseFloat(data.max_value.toFixed(2)));
    });
    
    // Get asset details
    const asset = await Asset.findByPk(asset_id, {
      attributes: ['asset_id', 'name', 'asset_tag']
    });
    
    // Build response
    const response = {
      asset: asset || { asset_id },
      time_period: period,
      trends
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting sensor data trends:', error);
    res.status(500).json({ error: 'Failed to get sensor data trends' });
  }
};

// Get alert statistics
const getAlertStats = async (req, res) => {
  try {
    const { plant_id, time_period } = req.query;
    
    // Since we don't have the actual alerts model defined, we'll mock some data
    // In a real implementation, this would query the alerts database
    
    // Mock response for demonstration purposes
    const response = {
      time_period: time_period || 'month',
      alert_count: {
        critical: 5,
        warning: 12,
        info: 30,
        total: 47
      },
      alert_by_type: {
        'Temperature': 15,
        'Pressure': 8,
        'Vibration': 10,
        'Maintenance Due': 7,
        'Calibration Required': 7
      },
      recent_alerts: [
        {
          alert_id: 'ALT-001',
          asset_id: 'AST-001',
          asset_name: 'Pump Station Alpha',
          severity: 'critical',
          message: 'High temperature detected',
          timestamp: new Date().toISOString()
        },
        {
          alert_id: 'ALT-002',
          asset_id: 'AST-003',
          asset_name: 'Conveyor Belt B',
          severity: 'warning',
          message: 'Abnormal vibration detected',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ]
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting alert statistics:', error);
    res.status(500).json({ error: 'Failed to get alert statistics' });
  }
};

// Get predicted failures
const getPredictedFailures = async (req, res) => {
  try {
    const { threshold = 50 } = req.query;
    
    // Get assets with health scores below threshold
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
      open_work_order_count: workOrdersByAsset[asset.asset_id] ? workOrdersByAsset[asset.asset_id].length : 0,
      estimated_days_to_failure: Math.round((asset.health_score / 5) + Math.random() * 10) // Mock estimate
    }));
    
    const response = {
      threshold: parseInt(threshold),
      assets_at_risk_count: assets.length,
      assets_at_risk: assets
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting predicted failures:', error);
    res.status(500).json({ error: 'Failed to get predicted failures' });
  }
};

// Get maintenance cost breakdown
const getMaintenanceCostBreakdown = async (req, res) => {
  try {
    const { plant_id, time_period, asset_type_id } = req.query;
    
    // Determine time period (default: month)
    const period = time_period || 'month';
    
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
    
    // Format cost by work order type
    const costByType = {};
    costByWorkOrderType.forEach(data => {
      costByType[data.work_order_type] = {
        cost: parseFloat(data.getDataValue('total_cost') || 0),
        count: parseInt(data.getDataValue('work_order_count') || 0)
      };
    });
    
    // Calculate total maintenance cost
    let totalMaintenanceCost = 0;
    Object.values(costByType).forEach(type => {
      totalMaintenanceCost += type.cost;
    });
    
    // Build response
    const response = {
      time_period: period,
      total_maintenance_cost: totalMaintenanceCost,
      cost_by_work_order_type: costByType
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error getting maintenance cost breakdown:', error);
    res.status(500).json({ error: 'Failed to get maintenance cost breakdown' });
  }
};

module.exports = {
  getDashboardStats,
  getAssetHealthTrends,
  getWorkOrderStats,
  getMaintenanceEfficiency,
  getAssetUptime,
  getSensorTrends,
  getAlertStats,
  getPredictedFailures,
  getMaintenanceCostBreakdown
};
