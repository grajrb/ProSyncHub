const { Op } = require('sequelize');
const { Asset, AssetType, Location, Plant, User } = require('../models');
const AssetSensorReading = require('../models/mongodb/AssetSensorReading');
const AssetEventLog = require('../models/mongodb/AssetEventLog');
const WorkOrder = require('../models/postgres/WorkOrder');
const winston = require('winston');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'asset-controller' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'asset-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'asset.log' })
  ]
});

// Helper function to build filter conditions
const buildFilterConditions = (query) => {
  const conditions = {};
  
  if (query.name) {
    conditions.name = { [Op.iLike]: `%${query.name}%` };
  }
  
  if (query.status) {
    conditions.current_status = query.status;
  }
  
  if (query.asset_type_id) {
    conditions.asset_type_id = query.asset_type_id;
  }
  
  if (query.location_id) {
    conditions.location_id = query.location_id;
  }
  
  if (query.plant_id) {
    conditions.plant_id = query.plant_id;
  }
  
  return conditions;
};

// Get all assets with pagination and filtering
const getAllAssets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    const conditions = buildFilterConditions(req.query);
    
    // Get assets with count
    const { count, rows: assets } = await Asset.findAndCountAll({
      where: conditions,
      include: [
        { model: AssetType, as: 'asset_type' },
        { model: Location, as: 'location' },
        { model: Plant, as: 'plant' }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.status(200).json({
      assets,
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    logger.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
};

// Get asset by ID
const getAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const asset = await Asset.findByPk(id, {
      include: [
        { model: AssetType, as: 'asset_type' },
        { model: Location, as: 'location' },
        { model: Plant, as: 'plant' },
        { model: User, as: 'assigned_to' }
      ]
    });
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.status(200).json(asset);
  } catch (error) {
    logger.error(`Error fetching asset with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
};

// Create new asset
const createAsset = async (req, res) => {
  try {
    const {
      asset_tag,
      name,
      description,
      model,
      manufacturer,
      serial_number,
      installation_date,
      asset_type_id,
      location_id,
      plant_id,
      assigned_to_id,
      warranty_expiry_date,
      purchase_date,
      purchase_cost,
      expected_lifetime
    } = req.body;
    
    // Check if asset tag already exists
    const existingAsset = await Asset.findOne({
      where: { asset_tag }
    });
    
    if (existingAsset) {
      return res.status(400).json({ error: 'Asset tag already exists' });
    }
    
    // Create new asset
    const newAsset = await Asset.create({
      asset_tag,
      name,
      description,
      model,
      manufacturer,
      serial_number,
      installation_date,
      asset_type_id,
      location_id,
      plant_id,
      assigned_to_id,
      warranty_expiry_date,
      purchase_date,
      purchase_cost,
      expected_lifetime,
      current_status: 'ONLINE',
      health_score: 100,
      created_by: req.user.user_id
    });
    
    // Create asset creation event log
    await AssetEventLog.create({
      asset_id: newAsset.asset_id,
      event_type: 'CREATED',
      description: `Asset ${newAsset.name} (${newAsset.asset_tag}) was created`,
      user_id: req.user.user_id,
      user_name: `${req.user.first_name} ${req.user.last_name}`
    });
    
    // Fetch the complete asset with relationships
    const asset = await Asset.findByPk(newAsset.asset_id, {
      include: [
        { model: AssetType, as: 'asset_type' },
        { model: Location, as: 'location' },
        { model: Plant, as: 'plant' },
        { model: User, as: 'assigned_to' }
      ]
    });
    
    res.status(201).json(asset);
  } catch (error) {
    logger.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
};

// Update asset
const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Find asset
    const asset = await Asset.findByPk(id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Check if updating asset tag and if it already exists
    if (updateData.asset_tag && updateData.asset_tag !== asset.asset_tag) {
      const existingAsset = await Asset.findOne({
        where: { 
          asset_tag: updateData.asset_tag,
          asset_id: { [Op.ne]: id }
        }
      });
      
      if (existingAsset) {
        return res.status(400).json({ error: 'Asset tag already exists' });
      }
    }
    
    // Update asset
    await asset.update({
      ...updateData,
      updated_by: req.user.user_id
    });
    
    // Create asset update event log
    await AssetEventLog.create({
      asset_id: asset.asset_id,
      event_type: 'UPDATED',
      description: `Asset ${asset.name} (${asset.asset_tag}) was updated`,
      user_id: req.user.user_id,
      user_name: `${req.user.first_name} ${req.user.last_name}`,
      metadata: { updated_fields: Object.keys(updateData) }
    });
    
    // Fetch the updated asset with relationships
    const updatedAsset = await Asset.findByPk(id, {
      include: [
        { model: AssetType, as: 'asset_type' },
        { model: Location, as: 'location' },
        { model: Plant, as: 'plant' },
        { model: User, as: 'assigned_to' }
      ]
    });
    
    res.status(200).json(updatedAsset);
  } catch (error) {
    logger.error(`Error updating asset with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
};

// Delete asset
const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find asset
    const asset = await Asset.findByPk(id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Check for dependent work orders
    const workOrderCount = await WorkOrder.count({
      where: { asset_id: id }
    });
    
    if (workOrderCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete asset with associated work orders',
        work_order_count: workOrderCount
      });
    }
    
    // Create asset deletion event log before deleting
    await AssetEventLog.create({
      asset_id: asset.asset_id,
      event_type: 'DELETED',
      description: `Asset ${asset.name} (${asset.asset_tag}) was deleted`,
      user_id: req.user.user_id,
      user_name: `${req.user.first_name} ${req.user.last_name}`
    });
    
    // Delete asset
    await asset.destroy();
    
    res.status(200).json({ message: 'Asset successfully deleted' });
  } catch (error) {
    logger.error(`Error deleting asset with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
};

// Get asset sensor readings
const getAssetSensorReadings = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sensor_type,
      from_date,
      to_date,
      limit = 100,
      aggregation = 'none'
    } = req.query;
    
    // Verify asset exists
    const asset = await Asset.findByPk(id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Build query
    const query = { asset_id: id };
    
    if (sensor_type) {
      query.sensor_type = sensor_type;
    }
    
    if (from_date || to_date) {
      query.timestamp = {};
      
      if (from_date) {
        query.timestamp.$gte = new Date(from_date);
      }
      
      if (to_date) {
        query.timestamp.$lte = new Date(to_date);
      }
    }
    
    let readings;
    
    if (aggregation === 'none') {
      // Get raw readings
      readings = await AssetSensorReading.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));
    } else {
      // Aggregate readings
      const aggregationPipeline = [
        { $match: query },
        {
          $group: {
            _id: {
              sensor_type: "$sensor_type",
              timestamp: aggregation === 'hourly' 
                ? { $dateToString: { format: "%Y-%m-%d-%H", date: "$timestamp" } }
                : aggregation === 'daily'
                  ? { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
                  : { $dateToString: { format: "%Y-%m", date: "$timestamp" } }
            },
            avg_value: { $avg: "$value" },
            min_value: { $min: "$value" },
            max_value: { $max: "$value" },
            count: { $sum: 1 },
            first_timestamp: { $min: "$timestamp" },
            last_timestamp: { $max: "$timestamp" }
          }
        },
        { $sort: { "first_timestamp": -1 } },
        { $limit: parseInt(limit) }
      ];
      
      readings = await AssetSensorReading.aggregate(aggregationPipeline);
    }
    
    res.status(200).json(readings);
  } catch (error) {
    logger.error(`Error fetching sensor readings for asset ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch asset sensor readings' });
  }
};

// Get asset events/logs
const getAssetEvents = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      event_type,
      from_date,
      to_date,
      limit = 50,
      page = 1
    } = req.query;
    
    // Verify asset exists
    const asset = await Asset.findByPk(id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Build query
    const query = { asset_id: id };
    
    if (event_type) {
      query.event_type = event_type;
    }
    
    if (from_date || to_date) {
      query.timestamp = {};
      
      if (from_date) {
        query.timestamp.$gte = new Date(from_date);
      }
      
      if (to_date) {
        query.timestamp.$lte = new Date(to_date);
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get events with count
    const count = await AssetEventLog.countDocuments(query);
    const events = await AssetEventLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      events,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    logger.error(`Error fetching events for asset ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch asset events' });
  }
};

// Get work orders for asset
const getAssetWorkOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      limit = 20,
      page = 1
    } = req.query;
    
    // Verify asset exists
    const asset = await Asset.findByPk(id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Build query
    const where = { asset_id: id };
    
    if (status) {
      where.status = status;
    }
    
    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Get work orders with count
    const { count, rows: workOrders } = await WorkOrder.findAndCountAll({
      where,
      include: [
        { model: User, as: 'assigned_to' },
        { model: User, as: 'created_by_user' }
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      work_orders: workOrders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    logger.error(`Error fetching work orders for asset ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch asset work orders' });
  }
};

<<<<<<< HEAD
=======
// Get asset maintenance schedules
const getAssetMaintenanceSchedules = async (req, res) => {
  try {
    const assetId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Check if asset exists
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Query for maintenance schedules associated with this asset
    const maintenanceSchedules = await db.MaintenanceSchedule.findAndCountAll({
      where: { asset_id: assetId },
      limit: parseInt(limit),
      offset,
      order: [['next_date', 'ASC']]
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(maintenanceSchedules.count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      maintenance_schedules: maintenanceSchedules.rows,
      pagination: {
        total: maintenanceSchedules.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    logger.error(`Error fetching maintenance schedules for asset ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch asset maintenance schedules' });
  }
};

// Generate QR code for asset
const generateAssetQRCode = async (req, res) => {
  try {
    const assetId = req.params.id;
    
    // Check if asset exists
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // In a real implementation, we would generate a QR code here
    // For this demo, we'll just return a placeholder URL
    const qrCodeData = {
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/assets/${assetId}`,
      asset_id: assetId,
      asset_tag: asset.asset_tag,
      name: asset.name
    };
    
    res.status(200).json({
      qr_code_url: `/api/assets/${assetId}/qr-code-image`,
      qr_code_data: qrCodeData
    });
  } catch (error) {
    logger.error(`Error generating QR code for asset ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to generate asset QR code' });
  }
};

// Get asset health score history
const getAssetHealthHistory = async (req, res) => {
  try {
    const assetId = req.params.id;
    const { timeframe = '30d' } = req.query;
    
    // Check if asset exists
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Calculate date range based on timeframe
    const endDate = new Date();
    let startDate = new Date();
    
    if (timeframe === '7d') {
      startDate.setDate(endDate.getDate() - 7);
    } else if (timeframe === '30d') {
      startDate.setDate(endDate.getDate() - 30);
    } else if (timeframe === '90d') {
      startDate.setDate(endDate.getDate() - 90);
    } else if (timeframe === '1y') {
      startDate.setFullYear(endDate.getFullYear() - 1);
    }
    
    // In a real implementation, we would query a time-series database
    // For this demo, we'll generate some random health score data
    const healthHistory = [];
    const dayDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= dayDiff; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Generate a random health score that trends downward over time
      // with some fluctuations
      const baseScore = 100 - (i / dayDiff) * 30;
      const fluctuation = Math.random() * 10 - 5;
      const healthScore = Math.min(100, Math.max(0, Math.round(baseScore + fluctuation)));
      
      healthHistory.push({
        date: date.toISOString().split('T')[0],
        health_score: healthScore
      });
    }
    
    res.status(200).json({
      asset_id: assetId,
      timeframe,
      health_history: healthHistory
    });
  } catch (error) {
    logger.error(`Error fetching health history for asset ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch asset health history' });
  }
};

>>>>>>> 368efa71b6c2eec7564d7f16accc1e3f5a43c8b1
module.exports = {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetSensorReadings,
  getAssetEvents,
<<<<<<< HEAD
  getAssetWorkOrders
=======
  getAssetWorkOrders,
  getAssetMaintenanceSchedules,
  generateAssetQRCode,
  getAssetHealthHistory
>>>>>>> 368efa71b6c2eec7564d7f16accc1e3f5a43c8b1
};
