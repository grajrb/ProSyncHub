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
    if (Array.isArray(query.status)) {
      conditions.status = { [Op.in]: query.status };
    } else {
      conditions.status = query.status;
    }
  }
  
  if (query.priority) {
    if (Array.isArray(query.priority)) {
      conditions.priority = { [Op.in]: query.priority };
    } else {
      conditions.priority = query.priority;
    }
  }
  
  if (query.work_order_type) {
    conditions.work_order_type = query.work_order_type;
  }
  
  if (query.asset_id) {
    conditions.asset_id = query.asset_id;
  }
  
  if (query.assigned_to_id) {
    conditions.assigned_to_id = query.assigned_to_id;
  }
  
  if (query.due_date_from || query.due_date_to) {
    conditions.due_date = {};
    
    if (query.due_date_from) {
      conditions.due_date[Op.gte] = new Date(query.due_date_from);
    }
    
    if (query.due_date_to) {
      conditions.due_date[Op.lte] = new Date(query.due_date_to);
    }
  }
  
  if (query.created_at_from || query.created_at_to) {
    conditions.created_at = {};
    
    if (query.created_at_from) {
      conditions.created_at[Op.gte] = new Date(query.created_at_from);
    }
    
    if (query.created_at_to) {
      conditions.created_at[Op.lte] = new Date(query.created_at_to);
    }
  }
  
  return conditions;
};

// Get all work orders with pagination and filtering
const getAllWorkOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    const conditions = buildFilterConditions(req.query);
    
    // Get work orders with count
    const { count, rows: workOrders } = await WorkOrder.findAndCountAll({
      where: conditions,
      include: [
        { model: Asset, as: 'asset' },
        { model: User, as: 'assigned_to' },
        { model: User, as: 'created_by_user' }
      ],
      limit,
      offset,
      order: [
        ['priority', 'ASC'], // High priority first
        ['due_date', 'ASC'],
        ['created_at', 'DESC']
      ]
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.status(200).json({
      work_orders: workOrders,
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
    logger.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
};

// Get work order by ID
const getWorkOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const workOrder = await WorkOrder.findByPk(id, {
      include: [
        { model: Asset, as: 'asset' },
        { model: User, as: 'assigned_to' },
        { model: User, as: 'created_by_user' },
        { model: User, as: 'updated_by_user' },
        { model: SparePart, as: 'spare_parts' }
      ]
    });
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Get maintenance checklist if exists
    const checklist = await MaintenanceChecklist.findOne({
      work_order_id: id
    });
    
    // Combine results
    const result = {
      ...workOrder.toJSON(),
      checklist: checklist || null
    };
    
    res.status(200).json(result);
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
      work_order_type,
      priority,
      asset_id,
      assigned_to_id,
      due_date,
      estimated_hours,
      spare_part_ids,
      checklist_items
    } = req.body;
    
    // Verify asset exists
    const asset = await Asset.findByPk(asset_id);
    
    if (!asset) {
      return res.status(400).json({ error: 'Asset not found' });
    }
    
    // Verify assigned user exists if provided
    if (assigned_to_id) {
      const assignedUser = await User.findByPk(assigned_to_id);
      
      if (!assignedUser) {
        return res.status(400).json({ error: 'Assigned user not found' });
      }
    }
    
    // Start a transaction
    const transaction = await WorkOrder.sequelize.transaction();
    
    try {
      // Create new work order
      const newWorkOrder = await WorkOrder.create({
        title,
        description,
        work_order_type,
        priority,
        status: 'OPEN',
        asset_id,
        assigned_to_id,
        due_date,
        estimated_hours,
        created_by: req.user.user_id
      }, { transaction });
      
      // Associate spare parts if provided
      if (spare_part_ids && spare_part_ids.length > 0) {
        await newWorkOrder.addSpareParts(spare_part_ids, { transaction });
      }
      
      // Create checklist if provided
      if (checklist_items && checklist_items.length > 0) {
        await MaintenanceChecklist.create({
          work_order_id: newWorkOrder.work_order_id,
          asset_id,
          items: checklist_items.map(item => ({
            ...item,
            completed: false,
            completed_by: null,
            completed_at: null
          })),
          created_by: req.user.user_id
        });
      }
      
      // Create work order creation event log
      await AssetEventLog.create({
        asset_id,
        event_type: 'WORK_ORDER_CREATED',
        description: `Work order "${title}" created for asset`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        related_id: newWorkOrder.work_order_id,
        related_type: 'work_order'
      });
      
      // Create user activity
      await UserActivityFeed.create({
        user_id: req.user.user_id,
        activity_type: 'WORK_ORDER_CREATED',
        description: `Created work order "${title}" for asset ${asset.name}`,
        related_id: newWorkOrder.work_order_id,
        related_type: 'work_order'
      });
      
      // If assigned to a user, create activity for that user
      if (assigned_to_id) {
        await UserActivityFeed.create({
          user_id: assigned_to_id,
          activity_type: 'WORK_ORDER_ASSIGNED',
          description: `You were assigned to work order "${title}" for asset ${asset.name}`,
          related_id: newWorkOrder.work_order_id,
          related_type: 'work_order'
        });
      }
      
      // Commit transaction
      await transaction.commit();
      
      // Fetch the complete work order with relationships
      const workOrder = await WorkOrder.findByPk(newWorkOrder.work_order_id, {
        include: [
          { model: Asset, as: 'asset' },
          { model: User, as: 'assigned_to' },
          { model: User, as: 'created_by_user' },
          { model: SparePart, as: 'spare_parts' }
        ]
      });
      
      // Get checklist if created
      const checklist = checklist_items && checklist_items.length > 0
        ? await MaintenanceChecklist.findOne({ work_order_id: newWorkOrder.work_order_id })
        : null;
      
      // Combine results
      const result = {
        ...workOrder.toJSON(),
        checklist: checklist || null
      };
      
      res.status(201).json(result);
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Error creating work order:', error);
    res.status(500).json({ error: 'Failed to create work order' });
  }
};

// Update work order
const updateWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Find work order
    const workOrder = await WorkOrder.findByPk(id);
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Start a transaction
    const transaction = await WorkOrder.sequelize.transaction();
    
    try {
      // Track status change
      const statusChanged = updateData.status && updateData.status !== workOrder.status;
      const oldStatus = workOrder.status;
      const newStatus = updateData.status;
      
      // Track assignment change
      const assignmentChanged = updateData.assigned_to_id && 
        updateData.assigned_to_id !== workOrder.assigned_to_id;
      const oldAssignedToId = workOrder.assigned_to_id;
      const newAssignedToId = updateData.assigned_to_id;
      
      // Update work order
      await workOrder.update({
        ...updateData,
        updated_by: req.user.user_id
      }, { transaction });
      
      // Update spare parts if provided
      if (updateData.spare_part_ids) {
        // Remove existing associations
        await workOrder.setSpareParts([], { transaction });
        
        // Add new associations
        if (updateData.spare_part_ids.length > 0) {
          await workOrder.addSpareParts(updateData.spare_part_ids, { transaction });
        }
      }
      
      // Update checklist if provided
      if (updateData.checklist_items) {
        const existingChecklist = await MaintenanceChecklist.findOne({
          work_order_id: id
        });
        
        if (existingChecklist) {
          // Update existing checklist
          await MaintenanceChecklist.updateOne(
            { work_order_id: id },
            { 
              $set: { 
                items: updateData.checklist_items,
                updated_by: req.user.user_id
              } 
            }
          );
        } else if (updateData.checklist_items.length > 0) {
          // Create new checklist
          await MaintenanceChecklist.create({
            work_order_id: id,
            asset_id: workOrder.asset_id,
            items: updateData.checklist_items.map(item => ({
              ...item,
              completed: item.completed || false,
              completed_by: item.completed_by || null,
              completed_at: item.completed_at || null
            })),
            created_by: req.user.user_id
          });
        }
      }
      
      // Create work order update event log
      await AssetEventLog.create({
        asset_id: workOrder.asset_id,
        event_type: 'WORK_ORDER_UPDATED',
        description: `Work order "${workOrder.title}" was updated`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        related_id: workOrder.work_order_id,
        related_type: 'work_order',
        metadata: { updated_fields: Object.keys(updateData) }
      });
      
      // Create user activity
      await UserActivityFeed.create({
        user_id: req.user.user_id,
        activity_type: 'WORK_ORDER_UPDATED',
        description: `Updated work order "${workOrder.title}"`,
        related_id: workOrder.work_order_id,
        related_type: 'work_order'
      });
      
      // Handle status change
      if (statusChanged) {
        // Create status change event
        await AssetEventLog.create({
          asset_id: workOrder.asset_id,
          event_type: 'WORK_ORDER_STATUS_CHANGED',
          description: `Work order "${workOrder.title}" status changed from ${oldStatus} to ${newStatus}`,
          user_id: req.user.user_id,
          user_name: `${req.user.first_name} ${req.user.last_name}`,
          related_id: workOrder.work_order_id,
          related_type: 'work_order',
          metadata: { old_status: oldStatus, new_status: newStatus }
        });
        
        // Create activity for the assigned user
        if (workOrder.assigned_to_id) {
          await UserActivityFeed.create({
            user_id: workOrder.assigned_to_id,
            activity_type: 'WORK_ORDER_STATUS_CHANGED',
            description: `Work order "${workOrder.title}" status changed to ${newStatus}`,
            related_id: workOrder.work_order_id,
            related_type: 'work_order'
          });
        }
        
        // Update asset status if work order is COMPLETED
        if (newStatus === 'COMPLETED') {
          // Find asset
          const asset = await Asset.findByPk(workOrder.asset_id);
          
          if (asset) {
            // Set asset status to ONLINE
            await asset.update({ 
              current_status: 'ONLINE',
              updated_by: req.user.user_id
            }, { transaction });
            
            // Log asset status change
            await AssetEventLog.create({
              asset_id: asset.asset_id,
              event_type: 'STATUS_CHANGED',
              description: `Asset status changed to ONLINE after work order completion`,
              user_id: req.user.user_id,
              user_name: `${req.user.first_name} ${req.user.last_name}`,
              related_id: workOrder.work_order_id,
              related_type: 'work_order'
            });
          }
        }
      }
      
      // Handle assignment change
      if (assignmentChanged) {
        // Create assignment change event
        await AssetEventLog.create({
          asset_id: workOrder.asset_id,
          event_type: 'WORK_ORDER_ASSIGNMENT_CHANGED',
          description: `Work order "${workOrder.title}" assignment changed`,
          user_id: req.user.user_id,
          user_name: `${req.user.first_name} ${req.user.last_name}`,
          related_id: workOrder.work_order_id,
          related_type: 'work_order'
        });
        
        // Create activity for the new assigned user
        if (newAssignedToId) {
          await UserActivityFeed.create({
            user_id: newAssignedToId,
            activity_type: 'WORK_ORDER_ASSIGNED',
            description: `You were assigned to work order "${workOrder.title}"`,
            related_id: workOrder.work_order_id,
            related_type: 'work_order'
          });
        }
        
        // Create activity for the previously assigned user
        if (oldAssignedToId) {
          await UserActivityFeed.create({
            user_id: oldAssignedToId,
            activity_type: 'WORK_ORDER_UNASSIGNED',
            description: `You were unassigned from work order "${workOrder.title}"`,
            related_id: workOrder.work_order_id,
            related_type: 'work_order'
          });
        }
      }
      
      // Commit transaction
      await transaction.commit();
      
      // Fetch the updated work order with relationships
      const updatedWorkOrder = await WorkOrder.findByPk(id, {
        include: [
          { model: Asset, as: 'asset' },
          { model: User, as: 'assigned_to' },
          { model: User, as: 'created_by_user' },
          { model: User, as: 'updated_by_user' },
          { model: SparePart, as: 'spare_parts' }
        ]
      });
      
      // Get checklist
      const checklist = await MaintenanceChecklist.findOne({
        work_order_id: id
      });
      
      // Combine results
      const result = {
        ...updatedWorkOrder.toJSON(),
        checklist: checklist || null
      };
      
      res.status(200).json(result);
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`Error updating work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update work order' });
  }
};

// Delete work order
const deleteWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find work order
    const workOrder = await WorkOrder.findByPk(id);
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Create work order deletion event log before deleting
    await AssetEventLog.create({
      asset_id: workOrder.asset_id,
      event_type: 'WORK_ORDER_DELETED',
      description: `Work order "${workOrder.title}" was deleted`,
      user_id: req.user.user_id,
      user_name: `${req.user.first_name} ${req.user.last_name}`,
      related_id: workOrder.work_order_id,
      related_type: 'work_order'
    });
    
    // Create user activity
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'WORK_ORDER_DELETED',
      description: `Deleted work order "${workOrder.title}"`,
      related_id: workOrder.work_order_id,
      related_type: 'work_order'
    });
    
    // Delete associated checklist
    await MaintenanceChecklist.deleteOne({
      work_order_id: id
    });
    
    // Delete work order
    await workOrder.destroy();
    
    res.status(200).json({ message: 'Work order successfully deleted' });
  } catch (error) {
    logger.error(`Error deleting work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
};

// Update work order status
const updateWorkOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Find work order
    const workOrder = await WorkOrder.findByPk(id);
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Validate status
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Start a transaction
    const transaction = await WorkOrder.sequelize.transaction();
    
    try {
      const oldStatus = workOrder.status;
      
      // Update work order
      await workOrder.update({
        status,
        status_notes: notes,
        updated_by: req.user.user_id,
        ...(status === 'COMPLETED' ? { completed_at: new Date(), completed_by: req.user.user_id } : {})
      }, { transaction });
      
      // Create status change event
      await AssetEventLog.create({
        asset_id: workOrder.asset_id,
        event_type: 'WORK_ORDER_STATUS_CHANGED',
        description: `Work order "${workOrder.title}" status changed from ${oldStatus} to ${status}`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        related_id: workOrder.work_order_id,
        related_type: 'work_order',
        metadata: { old_status: oldStatus, new_status: status, notes }
      });
      
      // Create activity for the user
      await UserActivityFeed.create({
        user_id: req.user.user_id,
        activity_type: 'WORK_ORDER_STATUS_CHANGED',
        description: `Changed work order "${workOrder.title}" status to ${status}`,
        related_id: workOrder.work_order_id,
        related_type: 'work_order'
      });
      
      // Create activity for the assigned user if different from current user
      if (workOrder.assigned_to_id && workOrder.assigned_to_id !== req.user.user_id) {
        await UserActivityFeed.create({
          user_id: workOrder.assigned_to_id,
          activity_type: 'WORK_ORDER_STATUS_CHANGED',
          description: `Work order "${workOrder.title}" status changed to ${status}`,
          related_id: workOrder.work_order_id,
          related_type: 'work_order'
        });
      }
      
      // Update asset status if work order is COMPLETED
      if (status === 'COMPLETED') {
        // Find asset
        const asset = await Asset.findByPk(workOrder.asset_id);
        
        if (asset) {
          // Set asset status to ONLINE
          await asset.update({ 
            current_status: 'ONLINE',
            updated_by: req.user.user_id
          }, { transaction });
          
          // Log asset status change
          await AssetEventLog.create({
            asset_id: asset.asset_id,
            event_type: 'STATUS_CHANGED',
            description: `Asset status changed to ONLINE after work order completion`,
            user_id: req.user.user_id,
            user_name: `${req.user.first_name} ${req.user.last_name}`,
            related_id: workOrder.work_order_id,
            related_type: 'work_order'
          });
        }
      }
      
      // Commit transaction
      await transaction.commit();
      
      // Fetch the updated work order with relationships
      const updatedWorkOrder = await WorkOrder.findByPk(id, {
        include: [
          { model: Asset, as: 'asset' },
          { model: User, as: 'assigned_to' },
          { model: User, as: 'created_by_user' },
          { model: User, as: 'updated_by_user' }
        ]
      });
      
      res.status(200).json(updatedWorkOrder);
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`Error updating work order status with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update work order status' });
  }
};

// Assign work order to user
const assignWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to_id } = req.body;
    
    // Find work order
    const workOrder = await WorkOrder.findByPk(id);
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Verify user exists if provided
    if (assigned_to_id) {
      const assignedUser = await User.findByPk(assigned_to_id);
      
      if (!assignedUser) {
        return res.status(400).json({ error: 'Assigned user not found' });
      }
    }
    
    const oldAssignedToId = workOrder.assigned_to_id;
    
    // Update work order
    await workOrder.update({
      assigned_to_id,
      updated_by: req.user.user_id
    });
    
    // Create assignment change event
    await AssetEventLog.create({
      asset_id: workOrder.asset_id,
      event_type: 'WORK_ORDER_ASSIGNMENT_CHANGED',
      description: assigned_to_id 
        ? `Work order "${workOrder.title}" was assigned to a new user`
        : `Work order "${workOrder.title}" was unassigned`,
      user_id: req.user.user_id,
      user_name: `${req.user.first_name} ${req.user.last_name}`,
      related_id: workOrder.work_order_id,
      related_type: 'work_order'
    });
    
    // Create activity for the user making the change
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'WORK_ORDER_ASSIGNMENT_CHANGED',
      description: assigned_to_id 
        ? `Assigned work order "${workOrder.title}" to a different user`
        : `Unassigned work order "${workOrder.title}"`,
      related_id: workOrder.work_order_id,
      related_type: 'work_order'
    });
    
    // Create activity for the new assigned user
    if (assigned_to_id) {
      await UserActivityFeed.create({
        user_id: assigned_to_id,
        activity_type: 'WORK_ORDER_ASSIGNED',
        description: `You were assigned to work order "${workOrder.title}"`,
        related_id: workOrder.work_order_id,
        related_type: 'work_order'
      });
    }
    
    // Create activity for the previously assigned user
    if (oldAssignedToId && oldAssignedToId !== assigned_to_id) {
      await UserActivityFeed.create({
        user_id: oldAssignedToId,
        activity_type: 'WORK_ORDER_UNASSIGNED',
        description: `You were unassigned from work order "${workOrder.title}"`,
        related_id: workOrder.work_order_id,
        related_type: 'work_order'
      });
    }
    
    // Fetch the updated work order with relationships
    const updatedWorkOrder = await WorkOrder.findByPk(id, {
      include: [
        { model: Asset, as: 'asset' },
        { model: User, as: 'assigned_to' },
        { model: User, as: 'created_by_user' },
        { model: User, as: 'updated_by_user' }
      ]
    });
    
    res.status(200).json(updatedWorkOrder);
  } catch (error) {
    logger.error(`Error assigning work order with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to assign work order' });
  }
};

// Update work order checklist
const updateWorkOrderChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { checklist_items } = req.body;
    
    // Find work order
    const workOrder = await WorkOrder.findByPk(id);
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    // Find existing checklist
    const existingChecklist = await MaintenanceChecklist.findOne({
      work_order_id: id
    });
    
    if (!existingChecklist) {
      // Create new checklist
      const newChecklist = await MaintenanceChecklist.create({
        work_order_id: id,
        asset_id: workOrder.asset_id,
        items: checklist_items,
        created_by: req.user.user_id
      });
      
      // Create event log
      await AssetEventLog.create({
        asset_id: workOrder.asset_id,
        event_type: 'CHECKLIST_CREATED',
        description: `Checklist created for work order "${workOrder.title}"`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        related_id: workOrder.work_order_id,
        related_type: 'work_order'
      });
      
      res.status(201).json(newChecklist);
    } else {
      // Update existing checklist
      const updatedChecklist = await MaintenanceChecklist.findOneAndUpdate(
        { work_order_id: id },
        { 
          $set: { 
            items: checklist_items,
            updated_by: req.user.user_id,
            updated_at: new Date()
          } 
        },
        { new: true }
      );
      
      // Create event log
      await AssetEventLog.create({
        asset_id: workOrder.asset_id,
        event_type: 'CHECKLIST_UPDATED',
        description: `Checklist updated for work order "${workOrder.title}"`,
        user_id: req.user.user_id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        related_id: workOrder.work_order_id,
        related_type: 'work_order'
      });
      
      res.status(200).json(updatedChecklist);
    }
  } catch (error) {
    logger.error(`Error updating checklist for work order ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update work order checklist' });
  }
};

module.exports = {
  getAllWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  updateWorkOrderStatus,
  assignWorkOrder,
  updateWorkOrderChecklist
};
