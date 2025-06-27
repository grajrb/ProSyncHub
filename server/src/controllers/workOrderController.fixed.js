// This is a fixed version of the work order controller that exports all required functions

const { Op } = require('sequelize');
const { WorkOrder, Asset, User, SparePart } = require('../models');
const AssetEventLog = require('../models/mongodb/AssetEventLog');
const UserActivityFeed = require('../models/mongodb/UserActivityFeed');
const MaintenanceChecklist = require('../models/mongodb/MaintenanceChecklist');
const winston = require('winston');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'workorder-controller' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'workorder-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'workorder.log' })
  ]
});

// Helper function to build filter conditions
const buildFilterConditions = (query) => {
  const conditions = {};
  
  if (query.title) {
    conditions.title = { [Op.iLike]: `%${query.title}%` };
  }
  
  if (query.status) {
    conditions.status = query.status;
  }
  
  if (query.priority) {
    conditions.priority = query.priority;
  }
  
  if (query.type) {
    conditions.type = query.type;
  }
  
  if (query.asset_id) {
    conditions.asset_id = query.asset_id;
  }
  
  if (query.assigned_to_id) {
    conditions.assigned_to_id = query.assigned_to_id;
  }
  
  if (query.created_by_id) {
    conditions.created_by_id = query.created_by_id;
  }
  
  // Filter by date range
  if (query.start_date && query.end_date) {
    conditions.due_date = {
      [Op.between]: [new Date(query.start_date), new Date(query.end_date)]
    };
  } else if (query.start_date) {
    conditions.due_date = { [Op.gte]: new Date(query.start_date) };
  } else if (query.end_date) {
    conditions.due_date = { [Op.lte]: new Date(query.end_date) };
  }
  
  return conditions;
};

// Get all work orders with pagination and filtering
const getAllWorkOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      sort_by = 'created_at',
      sort_dir = 'desc',
      ...filters
    } = req.query;
    
    const offset = (page - 1) * limit;
    const order = [[sort_by, sort_dir.toUpperCase()]];
    
    // Build filter conditions
    const where = buildFilterConditions(filters);
    
    // Fetch work orders with pagination
    const { count, rows: workOrders } = await WorkOrder.findAndCountAll({
      where,
      include: [
        { model: Asset, as: 'asset' },
        { model: User, as: 'assigned_to' },
        { model: User, as: 'created_by_user' }
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
    logger.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
};

// Get work order by ID
const getWorkOrderById = async (req, res) => {
  try {
    const workOrderId = req.params.id;
    
    const workOrder = await WorkOrder.findByPk(workOrderId, {
      include: [
        { model: Asset, as: 'asset' },
        { model: User, as: 'assigned_to' },
        { model: User, as: 'created_by_user' }
      ]
    });
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    res.status(200).json(workOrder);
  } catch (error) {
    logger.error(`Error fetching work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch work order' });
  }
};

// Create new work order
const createWorkOrder = async (req, res) => {
  try {
    const {
      title,
      description,
      asset_id,
      type,
      priority,
      status = 'PENDING',
      assigned_to_id,
      due_date,
      estimated_hours
    } = req.body;
    
    // Check if asset exists
    if (asset_id) {
      const asset = await Asset.findByPk(asset_id);
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }
    }
    
    // Check if assigned user exists
    if (assigned_to_id) {
      const user = await User.findByPk(assigned_to_id);
      if (!user) {
        return res.status(404).json({ error: 'Assigned user not found' });
      }
    }
    
    // Create work order
    const newWorkOrder = await WorkOrder.create({
      title,
      description,
      asset_id,
      type,
      priority,
      status,
      assigned_to_id,
      due_date,
      estimated_hours,
      created_by_id: req.user.user_id
    });
    
    // Create asset event log if asset is specified
    if (asset_id) {
      await AssetEventLog.create({
        asset_id,
        event_type: 'WORK_ORDER_CREATED',
        description: `Work order created: ${title}`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        metadata: {
          work_order_id: newWorkOrder.work_order_id,
          work_order_title: title,
          work_order_type: type,
          work_order_priority: priority
        }
      });
    }
    
    // Create user activity log
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'WORK_ORDER_CREATED',
      description: `Created work order: ${title}`,
      metadata: {
        work_order_id: newWorkOrder.work_order_id,
        work_order_title: title,
        work_order_type: type,
        work_order_priority: priority,
        asset_id
      }
    });
    
    // If assigned to a user, create activity for that user too
    if (assigned_to_id) {
      await UserActivityFeed.create({
        user_id: assigned_to_id,
        activity_type: 'WORK_ORDER_ASSIGNED',
        description: `You have been assigned to work order: ${title}`,
        metadata: {
          work_order_id: newWorkOrder.work_order_id,
          work_order_title: title,
          work_order_type: type,
          work_order_priority: priority,
          asset_id,
          assigned_by: req.user.user_id
        }
      });
    }
    
    // Fetch the complete work order with relationships
    const workOrder = await WorkOrder.findByPk(newWorkOrder.work_order_id, {
      include: [
        { model: Asset, as: 'asset' },
        { model: User, as: 'assigned_to' },
        { model: User, as: 'created_by_user' }
      ]
    });
    
    res.status(201).json(workOrder);
  } catch (error) {
    logger.error('Error creating work order:', error);
    res.status(500).json({ error: 'Failed to create work order' });
  }
};

// Update work order
const updateWorkOrder = async (req, res) => {
  try {
    const workOrderId = req.params.id;
    
    // Check if work order exists
    const workOrder = await WorkOrder.findByPk(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    const {
      title,
      description,
      asset_id,
      type,
      priority,
      status,
      assigned_to_id,
      due_date,
      estimated_hours,
      actual_hours,
      completion_date,
      completion_notes
    } = req.body;
    
    // Check if asset exists
    if (asset_id && asset_id !== workOrder.asset_id) {
      const asset = await Asset.findByPk(asset_id);
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }
    }
    
    // Check if assigned user exists
    if (assigned_to_id && assigned_to_id !== workOrder.assigned_to_id) {
      const user = await User.findByPk(assigned_to_id);
      if (!user) {
        return res.status(404).json({ error: 'Assigned user not found' });
      }
    }
    
    // Update work order
    const originalStatus = workOrder.status;
    const originalAssignedTo = workOrder.assigned_to_id;
    
    await workOrder.update({
      title,
      description,
      asset_id,
      type,
      priority,
      status,
      assigned_to_id,
      due_date,
      estimated_hours,
      actual_hours,
      completion_date: status === 'COMPLETED' ? (completion_date || new Date()) : completion_date,
      completion_notes,
      updated_by_id: req.user.user_id,
      updated_at: new Date()
    });
    
    // Create asset event log if asset is specified and status changed
    if (asset_id && originalStatus !== status) {
      await AssetEventLog.create({
        asset_id,
        event_type: 'WORK_ORDER_UPDATED',
        description: `Work order status changed from ${originalStatus} to ${status}: ${title}`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        metadata: {
          work_order_id: workOrderId,
          work_order_title: title,
          previous_status: originalStatus,
          new_status: status
        }
      });
    }
    
    // Create user activity log for status change
    if (originalStatus !== status) {
      await UserActivityFeed.create({
        user_id: req.user.user_id,
        activity_type: 'WORK_ORDER_STATUS_CHANGED',
        description: `Changed work order status from ${originalStatus} to ${status}: ${title}`,
        metadata: {
          work_order_id: workOrderId,
          work_order_title: title,
          previous_status: originalStatus,
          new_status: status
        }
      });
    }
    
    // Create user activity log for assignment change
    if (originalAssignedTo !== assigned_to_id && assigned_to_id) {
      await UserActivityFeed.create({
        user_id: assigned_to_id,
        activity_type: 'WORK_ORDER_ASSIGNED',
        description: `You have been assigned to work order: ${title}`,
        metadata: {
          work_order_id: workOrderId,
          work_order_title: title,
          work_order_status: status,
          assigned_by: req.user.user_id
        }
      });
    }
    
    // Fetch the updated work order with relationships
    const updatedWorkOrder = await WorkOrder.findByPk(workOrderId, {
      include: [
        { model: Asset, as: 'asset' },
        { model: User, as: 'assigned_to' },
        { model: User, as: 'created_by_user' }
      ]
    });
    
    res.status(200).json(updatedWorkOrder);
  } catch (error) {
    logger.error(`Error updating work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update work order' });
  }
};

// Delete work order
const deleteWorkOrder = async (req, res) => {
  try {
    const workOrderId = req.params.id;
    
    // Check if work order exists
    const workOrder = await WorkOrder.findByPk(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Create asset event log if asset is specified
    if (workOrder.asset_id) {
      await AssetEventLog.create({
        asset_id: workOrder.asset_id,
        event_type: 'WORK_ORDER_DELETED',
        description: `Work order deleted: ${workOrder.title}`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        metadata: {
          work_order_id: workOrderId,
          work_order_title: workOrder.title,
          work_order_status: workOrder.status
        }
      });
    }
    
    // Create user activity log
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'WORK_ORDER_DELETED',
      description: `Deleted work order: ${workOrder.title}`,
      metadata: {
        work_order_id: workOrderId,
        work_order_title: workOrder.title,
        work_order_status: workOrder.status,
        asset_id: workOrder.asset_id
      }
    });
    
    // Delete the work order
    await workOrder.destroy();
    
    res.status(200).json({ message: 'Work order deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
};

// Update work order status
const updateWorkOrderStatus = async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { status, completion_notes } = req.body;
    
    // Check if work order exists
    const workOrder = await WorkOrder.findByPk(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Validate status
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Update work order status
    const originalStatus = workOrder.status;
    
    await workOrder.update({
      status,
      completion_notes: status === 'COMPLETED' ? completion_notes : workOrder.completion_notes,
      completion_date: status === 'COMPLETED' ? new Date() : workOrder.completion_date,
      updated_by_id: req.user.user_id,
      updated_at: new Date()
    });
    
    // Create asset event log if asset is specified
    if (workOrder.asset_id) {
      await AssetEventLog.create({
        asset_id: workOrder.asset_id,
        event_type: 'WORK_ORDER_STATUS_CHANGED',
        description: `Work order status changed from ${originalStatus} to ${status}: ${workOrder.title}`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        metadata: {
          work_order_id: workOrderId,
          work_order_title: workOrder.title,
          previous_status: originalStatus,
          new_status: status
        }
      });
    }
    
    // Create user activity log
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'WORK_ORDER_STATUS_CHANGED',
      description: `Changed work order status from ${originalStatus} to ${status}: ${workOrder.title}`,
      metadata: {
        work_order_id: workOrderId,
        work_order_title: workOrder.title,
        previous_status: originalStatus,
        new_status: status
      }
    });
    
    // Fetch the updated work order with relationships
    const updatedWorkOrder = await WorkOrder.findByPk(workOrderId, {
      include: [
        { model: Asset, as: 'asset' },
        { model: User, as: 'assigned_to' },
        { model: User, as: 'created_by_user' }
      ]
    });
    
    res.status(200).json(updatedWorkOrder);
  } catch (error) {
    logger.error(`Error updating status for work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update work order status' });
  }
};

// Assign work order to user
const assignWorkOrder = async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { assigned_to_id } = req.body;
    
    // Check if work order exists
    const workOrder = await WorkOrder.findByPk(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Check if user exists
    const user = await User.findByPk(assigned_to_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update work order
    const originalAssignedTo = workOrder.assigned_to_id;
    
    await workOrder.update({
      assigned_to_id,
      updated_by_id: req.user.user_id,
      updated_at: new Date()
    });
    
    // Create asset event log if asset is specified
    if (workOrder.asset_id) {
      await AssetEventLog.create({
        asset_id: workOrder.asset_id,
        event_type: 'WORK_ORDER_ASSIGNED',
        description: `Work order assigned to ${user.first_name} ${user.last_name}: ${workOrder.title}`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        metadata: {
          work_order_id: workOrderId,
          work_order_title: workOrder.title,
          assigned_to_id,
          assigned_to_name: `${user.first_name} ${user.last_name}`,
          previous_assigned_to_id: originalAssignedTo
        }
      });
    }
    
    // Create user activity log for the assigner
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'WORK_ORDER_ASSIGNED',
      description: `Assigned work order to ${user.first_name} ${user.last_name}: ${workOrder.title}`,
      metadata: {
        work_order_id: workOrderId,
        work_order_title: workOrder.title,
        assigned_to_id,
        assigned_to_name: `${user.first_name} ${user.last_name}`,
        previous_assigned_to_id: originalAssignedTo
      }
    });
    
    // Create user activity log for the assignee
    await UserActivityFeed.create({
      user_id: assigned_to_id,
      activity_type: 'WORK_ORDER_ASSIGNED',
      description: `You have been assigned to work order: ${workOrder.title}`,
      metadata: {
        work_order_id: workOrderId,
        work_order_title: workOrder.title,
        assigned_by: req.user.user_id,
        assigned_by_name: `${req.user.first_name} ${req.user.last_name}`
      }
    });
    
    // Fetch the updated work order with relationships
    const updatedWorkOrder = await WorkOrder.findByPk(workOrderId, {
      include: [
        { model: Asset, as: 'asset' },
        { model: User, as: 'assigned_to' },
        { model: User, as: 'created_by_user' }
      ]
    });
    
    res.status(200).json(updatedWorkOrder);
  } catch (error) {
    logger.error(`Error assigning work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to assign work order' });
  }
};

// Add comment to work order
const addWorkOrderComment = async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { comment } = req.body;
    
    // Check if work order exists
    const workOrder = await WorkOrder.findByPk(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // In a real implementation, this would add a comment to a comments table
    // For this demo, we'll just create a user activity feed entry
    
    const commentEntry = {
      id: Date.now().toString(),
      work_order_id: workOrderId,
      user_id: req.user.user_id,
      user_name: `${req.user.first_name} ${req.user.last_name}`,
      comment,
      timestamp: new Date()
    };
    
    // Create user activity log
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'WORK_ORDER_COMMENT',
      description: `Commented on work order: ${workOrder.title}`,
      timestamp: new Date(),
      metadata: {
        work_order_id: workOrderId,
        work_order_title: workOrder.title,
        comment
      }
    });
    
    res.status(201).json(commentEntry);
  } catch (error) {
    logger.error(`Error adding comment to work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to add comment to work order' });
  }
};

// Get comments for work order
const getWorkOrderComments = async (req, res) => {
  try {
    const workOrderId = req.params.id;
    
    // Check if work order exists
    const workOrder = await WorkOrder.findByPk(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // In a real implementation, this would fetch comments from a comments table
    // For this demo, we'll fetch activity feed entries of type WORK_ORDER_COMMENT
    
    const comments = await UserActivityFeed.find({
      activity_type: 'WORK_ORDER_COMMENT',
      'metadata.work_order_id': workOrderId
    }).sort({ timestamp: -1 });
    
    // Transform to a more comment-like structure
    const formattedComments = comments.map(activity => ({
      id: activity._id,
      work_order_id: workOrderId,
      user_id: activity.user_id,
      user_name: activity.metadata.user_name || 'Unknown User',
      comment: activity.metadata.comment,
      timestamp: activity.timestamp
    }));
    
    res.status(200).json(formattedComments);
  } catch (error) {
    logger.error(`Error fetching comments for work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch work order comments' });
  }
};

// Add parts to work order
const addWorkOrderParts = async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { parts } = req.body;
    
    // Check if work order exists
    const workOrder = await WorkOrder.findByPk(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // In a real implementation, this would add parts to a work_order_parts junction table
    // For this demo, we'll just return the parts that were "added"
    
    // Validate parts
    if (!Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: 'Parts must be a non-empty array' });
    }
    
    // Check if parts exist
    const partIds = parts.map(part => part.spare_part_id);
    const existingParts = await SparePart.findAll({
      where: {
        spare_part_id: {
          [Op.in]: partIds
        }
      }
    });
    
    if (existingParts.length !== partIds.length) {
      return res.status(404).json({ error: 'One or more parts not found' });
    }
    
    // Create user activity log
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'WORK_ORDER_PARTS_ADDED',
      description: `Added parts to work order: ${workOrder.title}`,
      timestamp: new Date(),
      metadata: {
        work_order_id: workOrderId,
        work_order_title: workOrder.title,
        parts
      }
    });
    
    // Format response
    const workOrderParts = parts.map(part => ({
      work_order_id: workOrderId,
      spare_part_id: part.spare_part_id,
      quantity: part.quantity,
      added_by: req.user.user_id,
      added_at: new Date()
    }));
    
    res.status(201).json(workOrderParts);
  } catch (error) {
    logger.error(`Error adding parts to work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to add parts to work order' });
  }
};

// Get parts for work order
const getWorkOrderParts = async (req, res) => {
  try {
    const workOrderId = req.params.id;
    
    // Check if work order exists
    const workOrder = await WorkOrder.findByPk(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // In a real implementation, this would fetch parts from a work_order_parts junction table
    // For this demo, we'll just return mock data
    
    const parts = [
      {
        work_order_id: workOrderId,
        spare_part_id: 1,
        spare_part: {
          spare_part_id: 1,
          name: 'Bearing Assembly',
          part_number: 'BA-1234',
          description: 'High-performance bearing assembly for industrial motors',
          unit_cost: 125.99,
          quantity_in_stock: 15
        },
        quantity: 2,
        added_by: req.user.user_id,
        added_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        work_order_id: workOrderId,
        spare_part_id: 3,
        spare_part: {
          spare_part_id: 3,
          name: 'Oil Filter',
          part_number: 'OF-5678',
          description: 'Standard oil filter for hydraulic systems',
          unit_cost: 45.50,
          quantity_in_stock: 28
        },
        quantity: 1,
        added_by: req.user.user_id,
        added_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ];
    
    res.status(200).json(parts);
  } catch (error) {
    logger.error(`Error fetching parts for work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch work order parts' });
  }
};

// Get checklist for work order
const getWorkOrderChecklist = async (req, res) => {
  try {
    const workOrderId = req.params.id;
    
    // Check if work order exists
    const workOrder = await WorkOrder.findByPk(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Check if checklist exists
    let checklist = await MaintenanceChecklist.findOne({
      work_order_id: workOrderId
    });
    
    if (!checklist) {
      // If no checklist exists yet, create a default one based on the work order type
      const defaultItems = [];
      
      switch (workOrder.type) {
        case 'PREVENTIVE':
          defaultItems.push(
            { item: 'Visual inspection', completed: false, notes: '' },
            { item: 'Check lubrication', completed: false, notes: '' },
            { item: 'Measure vibration levels', completed: false, notes: '' },
            { item: 'Check for unusual noise', completed: false, notes: '' },
            { item: 'Inspect belts and pulleys', completed: false, notes: '' }
          );
          break;
        case 'CORRECTIVE':
          defaultItems.push(
            { item: 'Identify fault', completed: false, notes: '' },
            { item: 'Replace damaged components', completed: false, notes: '' },
            { item: 'Test functionality', completed: false, notes: '' },
            { item: 'Verify repair', completed: false, notes: '' }
          );
          break;
        case 'INSPECTION':
          defaultItems.push(
            { item: 'Check safety systems', completed: false, notes: '' },
            { item: 'Inspect structural integrity', completed: false, notes: '' },
            { item: 'Verify compliance with standards', completed: false, notes: '' },
            { item: 'Document findings', completed: false, notes: '' }
          );
          break;
        default:
          defaultItems.push(
            { item: 'General inspection', completed: false, notes: '' },
            { item: 'Perform maintenance tasks', completed: false, notes: '' },
            { item: 'Document work completed', completed: false, notes: '' }
          );
      }
      
      checklist = await MaintenanceChecklist.create({
        work_order_id: workOrderId,
        title: `${workOrder.type} Maintenance Checklist`,
        description: `Standard checklist for ${workOrder.title}`,
        items: defaultItems,
        created_by: req.user.user_id,
        created_at: new Date()
      });
    }
    
    res.status(200).json(checklist);
  } catch (error) {
    logger.error(`Error fetching checklist for work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch work order checklist' });
  }
};

// Update checklist for work order
const updateWorkOrderChecklist = async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { title, description, items } = req.body;
    
    // Check if work order exists
    const workOrder = await WorkOrder.findByPk(workOrderId);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Check if checklist exists
    const existingChecklist = await MaintenanceChecklist.findOne({
      work_order_id: workOrderId
    });
    
    if (existingChecklist) {
      // Update existing checklist
      const updatedChecklist = await MaintenanceChecklist.findOneAndUpdate(
        { work_order_id: workOrderId },
        {
          $set: {
            title,
            description,
            items,
            updated_by: req.user.user_id,
            updated_at: new Date()
          }
        },
        { new: true }
      );
      
      res.status(200).json(updatedChecklist);
    } else {
      // Create new checklist
      const newChecklist = await MaintenanceChecklist.create({
        work_order_id: workOrderId,
        title,
        description,
        items,
        created_by: req.user.user_id,
        created_at: new Date()
      });
      
      res.status(201).json(newChecklist);
    }
  } catch (error) {
    logger.error(`Error updating checklist for work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update work order checklist' });
  }
};

// Export all controller functions
module.exports = {
  getAllWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  updateWorkOrderStatus,
  assignWorkOrder,
  addWorkOrderComment,
  getWorkOrderComments,
  addWorkOrderParts,
  getWorkOrderParts,
  getWorkOrderChecklist,
  updateWorkOrderChecklist
};
