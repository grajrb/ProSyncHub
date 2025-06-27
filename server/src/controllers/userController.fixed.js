// This is a fixed version of the user controller

const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { User, Role, Permission, WorkOrder } = require('../models');
const UserActivityFeed = require('../models/mongodb/UserActivityFeed');
const winston = require('winston');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-controller' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'user-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'user.log' })
  ]
});

// Helper function to build filter conditions
const buildFilterConditions = (query) => {
  const conditions = {};
  
  if (query.search) {
    conditions[Op.or] = [
      { username: { [Op.iLike]: `%${query.search}%` } },
      { email: { [Op.iLike]: `%${query.search}%` } },
      { first_name: { [Op.iLike]: `%${query.search}%` } },
      { last_name: { [Op.iLike]: `%${query.search}%` } }
    ];
  }
  
  if (query.role_id) {
    conditions.role_id = query.role_id;
  }
  
  if (query.is_active !== undefined) {
    conditions.is_active = query.is_active === 'true';
  }
  
  return conditions;
};

// Get all users with pagination and filtering
const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      sort_by = 'username',
      sort_dir = 'asc',
      ...filters
    } = req.query;
    
    const offset = (page - 1) * limit;
    const order = [[sort_by, sort_dir.toUpperCase()]];
    
    // Build filter conditions
    const where = buildFilterConditions(filters);
    
    // Fetch users with pagination
    const { count, rows: users } = await User.findAndCountAll({
      where,
      include: [{ model: Role, as: 'role' }],
      limit: parseInt(limit),
      offset,
      order,
      attributes: { exclude: ['password'] }
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      users,
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
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if authenticated user has permission to view this user
    // Only administrators can view other users' details
    if (req.user.user_id !== userId && req.user.role.name !== 'Administrator' && req.user.role.name !== 'Supervisor') {
      return res.status(403).json({ error: 'You do not have permission to view this user' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error fetching user with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Create new user
const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      role_id,
      phone_number,
      department,
      profile_image_url
    } = req.body;
    
    // Check if username or email already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({
        error: 'Username or email already exists',
        field: existingUser.username === username ? 'username' : 'email'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      first_name,
      last_name,
      role_id,
      phone_number,
      department,
      profile_image_url,
      is_active: true,
      created_by: req.user.user_id
    });
    
    // Log activity
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'USER_CREATED',
      description: `User ${req.user.username} created a new user: ${username}`,
      timestamp: new Date(),
      metadata: {
        created_user_id: newUser.user_id,
        created_username: username
      }
    });
    
    // Fetch the complete user with relationships
    const user = await User.findByPk(newUser.user_id, {
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password'] }
    });
    
    res.status(201).json(user);
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if authenticated user has permission to update this user
    // Users can update their own profile, but only administrators can update other users
    if (req.user.user_id !== userId && req.user.role.name !== 'Administrator') {
      return res.status(403).json({ error: 'You do not have permission to update this user' });
    }
    
    const {
      email,
      first_name,
      last_name,
      phone_number,
      department,
      profile_image_url
    } = req.body;
    
    // Update user
    await user.update({
      email,
      first_name,
      last_name,
      phone_number,
      department,
      profile_image_url,
      updated_by: req.user.user_id,
      updated_at: new Date()
    });
    
    // Log activity
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'USER_UPDATED',
      description: `User ${req.user.username} updated user: ${user.username}`,
      timestamp: new Date(),
      metadata: {
        updated_user_id: userId,
        updated_username: user.username
      }
    });
    
    // Fetch the updated user with relationships
    const updatedUser = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json(updatedUser);
  } catch (error) {
    logger.error(`Error updating user with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Change user password
const changeUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if authenticated user has permission to change this user's password
    // Users can change their own password, but only administrators can change other users' passwords
    if (req.user.user_id !== userId && req.user.role.name !== 'Administrator') {
      return res.status(403).json({ error: 'You do not have permission to change this user\'s password' });
    }
    
    const { current_password, new_password } = req.body;
    
    // If user is changing their own password, verify current password
    if (req.user.user_id === userId) {
      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);
    
    // Update password
    await user.update({
      password: hashedPassword,
      updated_by: req.user.user_id,
      updated_at: new Date()
    });
    
    // Log activity
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'PASSWORD_CHANGED',
      description: `User ${req.user.username} changed password for user: ${user.username}`,
      timestamp: new Date(),
      metadata: {
        target_user_id: userId,
        target_username: user.username
      }
    });
    
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error(`Error changing password for user with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has associated work orders
    const workOrderCount = await WorkOrder.count({
      where: { assigned_to_id: userId }
    });
    
    if (workOrderCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete user with associated work orders',
        work_order_count: workOrderCount
      });
    }
    
    // Log activity before deleting the user
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'USER_DELETED',
      description: `User ${req.user.username} deleted user: ${user.username}`,
      timestamp: new Date(),
      metadata: {
        deleted_user_id: userId,
        deleted_username: user.username,
        deleted_email: user.email
      }
    });
    
    // Delete the user
    await user.destroy();
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting user with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Get user activity feed
const getUserActivity = async (req, res) => {
  try {
    const userId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    
    // Check if user exists
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if authenticated user has permission to view this user's activity
    // Users can view their own activity, but only administrators can view other users' activity
    if (req.user.user_id !== userId && req.user.role.name !== 'Administrator' && req.user.role.name !== 'Supervisor') {
      return res.status(403).json({ error: 'You do not have permission to view this user\'s activity' });
    }
    
    // Fetch activity with pagination
    const skip = (page - 1) * limit;
    
    const [count, activities] = await Promise.all([
      UserActivityFeed.countDocuments({ user_id: userId }),
      UserActivityFeed.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      activities,
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
    logger.error(`Error fetching activity for user with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
};

// Get user's work orders
const getUserWorkOrders = async (req, res) => {
  try {
    const userId = req.params.id;
    const { page = 1, limit = 10, status } = req.query;
    
    // Check if user exists
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build query
    const where = { assigned_to_id: userId };
    
    if (status) {
      where.status = status;
    }
    
    const offset = (page - 1) * limit;
    
    // Fetch work orders with pagination
    const { count, rows: workOrders } = await WorkOrder.findAndCountAll({
      where,
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
    logger.error(`Error fetching work orders for user with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch user work orders' });
  }
};

// Get all roles
const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [{ model: Permission, as: 'permissions' }]
    });
    
    res.status(200).json(roles);
  } catch (error) {
    logger.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

// Update user's role
const updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role_id } = req.body;
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if role exists
    const role = await Role.findByPk(role_id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Update user's role
    await user.update({
      role_id,
      updated_by: req.user.user_id,
      updated_at: new Date()
    });
    
    // Log activity
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'ROLE_UPDATED',
      description: `User ${req.user.username} updated role for user: ${user.username} to ${role.name}`,
      timestamp: new Date(),
      metadata: {
        target_user_id: userId,
        target_username: user.username,
        previous_role_id: user.role_id,
        new_role_id: role_id,
        new_role_name: role.name
      }
    });
    
    // Fetch the updated user with relationships
    const updatedUser = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json(updatedUser);
  } catch (error) {
    logger.error(`Error updating role for user with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

// Update user's status (active/inactive)
const updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { is_active } = req.body;
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user's status
    await user.update({
      is_active,
      updated_by: req.user.user_id,
      updated_at: new Date()
    });
    
    // Log activity
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      description: `User ${req.user.username} ${is_active ? 'activated' : 'deactivated'} user: ${user.username}`,
      timestamp: new Date(),
      metadata: {
        target_user_id: userId,
        target_username: user.username,
        new_status: is_active
      }
    });
    
    // Fetch the updated user with relationships
    const updatedUser = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json(updatedUser);
  } catch (error) {
    logger.error(`Error updating status for user with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserPassword,
  deleteUser,
  getUserActivity,
  getUserWorkOrders,
  getAllRoles,
  updateUserRole,
  updateUserStatus
};
