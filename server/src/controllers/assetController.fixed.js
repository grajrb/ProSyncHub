// This is a fixed version of the asset controller

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
  
  if (query.health_min && query.health_max) {
    conditions.health_score = {
      [Op.between]: [parseInt(query.health_min), parseInt(query.health_max)]
    };
  } else if (query.health_min) {
    conditions.health_score = { [Op.gte]: parseInt(query.health_min) };
  } else if (query.health_max) {
    conditions.health_score = { [Op.lte]: parseInt(query.health_max) };
  }
  
  return conditions;
};

// Get all assets with pagination and filtering
const getAllAssets = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      sort_by = 'name',
      sort_dir = 'asc',
      ...filters
    } = req.query;
    
    const offset = (page - 1) * limit;
    const order = [[sort_by, sort_dir.toUpperCase()]];
    
    // Build filter conditions
    const where = buildFilterConditions(filters);
    
    // Fetch assets with pagination
    const { count, rows: assets } = await Asset.findAndCountAll({
      where,
      include: [
        { model: AssetType, as: 'asset_type' },
        { model: Location, as: 'location' },
        { model: Plant, as: 'plant' },
        { model: User, as: 'assigned_to' }
      ],
      limit: parseInt(limit),
      offset,
      order
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      assets,
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
    logger.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
};

// Get asset by ID
const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id, {
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
      name,
      description,
      asset_tag,
      serial_number,
      asset_type_id,
      location_id,
      plant_id,
      assigned_to_id,
      warranty_expiry_date,
      purchase_date,
      purchase_cost,
      expected_lifetime
    } = req.body;
    
    // Create the asset
    const newAsset = await Asset.create({
      name,
      description,
      asset_tag,
      serial_number,
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
    const assetId = req.params.id;
    
    // Check if asset exists
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Update asset
    const {
      name,
      description,
      asset_tag,
      serial_number,
      asset_type_id,
      location_id,
      plant_id,
      assigned_to_id,
      warranty_expiry_date,
      purchase_date,
      purchase_cost,
      expected_lifetime,
      current_status,
      health_score
    } = req.body;
    
    await asset.update({
      name,
      description,
      asset_tag,
      serial_number,
      asset_type_id,
      location_id,
      plant_id,
      assigned_to_id,
      warranty_expiry_date,
      purchase_date,
      purchase_cost,
      expected_lifetime,
      current_status,
      health_score,
      updated_by: req.user.user_id,
      updated_at: new Date()
    });
    
    // Create asset update event log
    await AssetEventLog.create({
      asset_id: assetId,
      event_type: 'UPDATED',
      description: `Asset ${asset.name} (${asset.asset_tag}) was updated`,
      user_id: req.user.user_id,
      user_name: `${req.user.first_name} ${req.user.last_name}`
    });
    
    // Fetch the updated asset with relationships
    const updatedAsset = await Asset.findByPk(assetId, {
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
    const assetId = req.params.id;
    
    // Check if asset exists
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Check if asset has associated work orders
    const workOrderCount = await WorkOrder.count({
      where: { asset_id: assetId }
    });
    
    if (workOrderCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete asset with associated work orders',
        work_order_count: workOrderCount
      });
    }
    
    // Create asset deletion event log before deleting the asset
    await AssetEventLog.create({
      asset_id: assetId,
      event_type: 'DELETED',
      description: `Asset ${asset.name} (${asset.asset_tag}) was deleted`,
      user_id: req.user.user_id,
      user_name: `${req.user.first_name} ${req.user.last_name}`
    });
    
    // Delete the asset
    await asset.destroy();
    
    res.status(200).json({ message: 'Asset deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting asset with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
};

// Get asset sensor readings
const getAssetSensorReadings = async (req, res) => {
  try {
    const assetId = req.params.id;
    const { start_date, end_date, sensor_type, page = 1, limit = 100 } = req.query;
    
    // Check if asset exists
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Build query
    const query = { asset_id: assetId };
    
    if (sensor_type) {
      query.sensor_type = sensor_type;
    }
    
    if (start_date && end_date) {
      query.timestamp = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    } else if (start_date) {
      query.timestamp = { $gte: new Date(start_date) };
    } else if (end_date) {
      query.timestamp = { $lte: new Date(end_date) };
    }
    
    // Fetch readings with pagination
    const skip = (page - 1) * limit;
    
    const [count, readings] = await Promise.all([
      AssetSensorReading.countDocuments(query),
      AssetSensorReading.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      readings,
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
    logger.error(`Error fetching sensor readings for asset ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch asset sensor readings' });
  }
};

// Get asset events/logs
const getAssetEvents = async (req, res) => {
  try {
    const assetId = req.params.id;
    const { event_type, start_date, end_date, page = 1, limit = 10 } = req.query;
    
    // Check if asset exists
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Build query
    const query = { asset_id: assetId };
    
    if (event_type) {
      query.event_type = event_type;
    }
    
    if (start_date && end_date) {
      query.timestamp = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    } else if (start_date) {
      query.timestamp = { $gte: new Date(start_date) };
    } else if (end_date) {
      query.timestamp = { $lte: new Date(end_date) };
    }
    
    // Fetch events with pagination
    const skip = (page - 1) * limit;
    
    const [count, events] = await Promise.all([
      AssetEventLog.countDocuments(query),
      AssetEventLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
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
    const assetId = req.params.id;
    const { status, priority, page = 1, limit = 10 } = req.query;
    
    // Check if asset exists
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Build query
    const where = { asset_id: assetId };
    
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    const offset = (page - 1) * limit;
    
    // Fetch work orders with pagination
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
    
    // For demonstration purposes, we'll return mock data
    // In a real application, this would query the MaintenanceSchedule model
    const maintenanceSchedules = [
      {
        id: 1,
        asset_id: assetId,
        title: 'Regular Inspection',
        description: 'Perform visual inspection and basic maintenance checks',
        frequency: 'WEEKLY',
        next_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        asset_id: assetId,
        title: 'Oil Change',
        description: 'Change oil and replace filters',
        frequency: 'QUARTERLY',
        next_due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 3,
        asset_id: assetId,
        title: 'Major Overhaul',
        description: 'Complete disassembly, inspection, and part replacement',
        frequency: 'YEARLY',
        next_due_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    const count = maintenanceSchedules.length;
    const paginatedSchedules = maintenanceSchedules.slice(offset, offset + parseInt(limit));
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      maintenance_schedules: paginatedSchedules,
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
    const { timeframe = '1month' } = req.query;
    
    // Check if asset exists
    const asset = await Asset.findByPk(assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // For demonstration purposes, we'll generate mock health history data
    // In a real application, this would query a health history table or calculate from sensor data
    
    let days = 30; // Default to 1 month
    
    if (timeframe === '1week') {
      days = 7;
    } else if (timeframe === '3months') {
      days = 90;
    } else if (timeframe === '6months') {
      days = 180;
    } else if (timeframe === '1year') {
      days = 365;
    }
    
    const healthHistory = [];
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const dayDiff = days > 0 ? days : 30;
    
    // Generate daily health scores
    for (let i = dayDiff; i >= 0; i--) {
      const date = new Date(now - i * dayMs);
      
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

// Export all controller functions
module.exports = {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetSensorReadings,
  getAssetEvents,
  getAssetWorkOrders,
  getAssetMaintenanceSchedules,
  generateAssetQRCode,
  getAssetHealthHistory
};
