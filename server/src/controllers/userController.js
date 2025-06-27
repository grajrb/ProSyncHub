const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { User, Role, Permission } = require('../models');
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
  
  if (query.status) {
    conditions.status = query.status;
  }
  
  if (query.role_id) {
    conditions.role_id = query.role_id;
  }
  
  return conditions;
};

// Get all users with pagination and filtering
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    const conditions = buildFilterConditions(req.query);
    
    // Get users with count
    const { count, rows: users } = await User.findAndCountAll({
      where: conditions,
      include: [
        { model: Role, as: 'role', include: [{ model: Permission, as: 'permissions' }] }
      ],
      attributes: { exclude: ['password_hash'] },
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.status(200).json({
      users,
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
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      include: [
        { model: Role, as: 'role', include: [{ model: Permission, as: 'permissions' }] }
      ],
      attributes: { exclude: ['password_hash'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
      phone,
      department,
      job_title
    } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Find role (default to Operator if not specified)
    const role = role_id 
      ? await Role.findByPk(role_id)
      : await Role.findOne({ where: { role_name: 'Operator' } });
    
    if (!role) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Create new user
    const newUser = await User.create({
      username,
      email,
      password_hash: hashedPassword,
      first_name,
      last_name,
      role_id: role.role_id,
      phone,
      department,
      job_title,
      status: 'ACTIVE',
      created_by: req.user.user_id
    });
    
    // Log activity
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'USER_CREATED',
      description: `Created new user: ${username}`,
      related_id: newUser.user_id,
      related_type: 'user'
    });
    
    // Fetch user with role
    const user = await User.findByPk(newUser.user_id, {
      include: [
        { model: Role, as: 'role', include: [{ model: Permission, as: 'permissions' }] }
      ],
      attributes: { exclude: ['password_hash'] }
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
    const { id } = req.params;
    const {
      username,
      email,
      first_name,
      last_name,
      role_id,
      phone,
      department,
      job_title,
      status
    } = req.body;
    
    // Find user
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check username/email uniqueness if changing
    if ((username && username !== user.username) || (email && email !== user.email)) {
      const existingUser = await User.findOne({
        where: {
          [Op.and]: [
            { [Op.or]: [
              ...(username ? [{ username }] : []),
              ...(email ? [{ email }] : [])
            ] },
            { user_id: { [Op.ne]: id } }
          ]
        }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
    }
    
    // Verify role if changing
    if (role_id && role_id !== user.role_id) {
      const role = await Role.findByPk(role_id);
      
      if (!role) {
        return res.status(400).json({ error: 'Invalid role' });
      }
    }
    
    // Create update object with only provided fields
    const updateData = {};
    
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (role_id) updateData.role_id = role_id;
    if (phone) updateData.phone = phone;
    if (department) updateData.department = department;
    if (job_title) updateData.job_title = job_title;
    if (status) updateData.status = status;
    
    updateData.updated_by = req.user.user_id;
    
    // Update user
    await user.update(updateData);
    
    // Log activity
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'USER_UPDATED',
      description: `Updated user: ${user.username}`,
      related_id: user.user_id,
      related_type: 'user',
      metadata: { updated_fields: Object.keys(updateData) }
    });
    
    // Fetch updated user with role
    const updatedUser = await User.findByPk(id, {
      include: [
        { model: Role, as: 'role', include: [{ model: Permission, as: 'permissions' }] }
      ],
      attributes: { exclude: ['password_hash'] }
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
    const { id } = req.params;
    const { password } = req.body;
    
    // Find user
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update user password
    await user.update({
      password_hash: hashedPassword,
      updated_by: req.user.user_id
    });
    
    // Log activity
    await UserActivityFeed.create({
      user_id: req.user.user_id,
      activity_type: 'USER_PASSWORD_CHANGED',
      description: `Changed password for user: ${user.username}`,
      related_id: user.user_id,
      related_type: 'user'
    });
    
    res.status(200).json({ message: 'Password successfully updated' });
  } catch (error) {
    logger.error(`Error changing password for user ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to change user password' });
  }
};

// Delete user (or deactivate)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { deactivate_only = true } = req.query;
    
    // Find user
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is the last admin
    if (user.role && user.role.role_name === 'Admin') {
      const adminCount = await User.count({
        include: [
          { 
            model: Role, 
            as: 'role',
            where: { role_name: 'Admin' }
          }
        ],
        where: {
          status: 'ACTIVE',
          user_id: { [Op.ne]: id }
        }
      });
      
      if (adminCount === 0) {
        return res.status(400).json({ error: 'Cannot delete or deactivate the last admin user' });
      }
    }
    
    if (deactivate_only === 'true' || deactivate_only === true) {
      // Deactivate user
      await user.update({
        status: 'INACTIVE',
        updated_by: req.user.user_id
      });
      
      // Log activity
      await UserActivityFeed.create({
        user_id: req.user.user_id,
        activity_type: 'USER_DEACTIVATED',
        description: `Deactivated user: ${user.username}`,
        related_id: user.user_id,
        related_type: 'user'
      });
      
      res.status(200).json({ message: 'User successfully deactivated' });
    } else {
      // Log activity before deleting
      await UserActivityFeed.create({
        user_id: req.user.user_id,
        activity_type: 'USER_DELETED',
        description: `Deleted user: ${user.username}`,
        related_id: user.user_id,
        related_type: 'user'
      });
      
      // Delete user
      await user.destroy();
      
      res.status(200).json({ message: 'User successfully deleted' });
    }
  } catch (error) {
    logger.error(`Error deleting/deactivating user with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete/deactivate user' });
  }
};

// Get user activity
const getUserActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      limit = 50,
      page = 1,
      activity_type
    } = req.query;
    
    // Verify user exists
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build query
    const query = { user_id: id };
    
    if (activity_type) {
      query.activity_type = activity_type;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get activities with count
    const count = await UserActivityFeed.countDocuments(query);
    const activities = await UserActivityFeed.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      },
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
    logger.error(`Error fetching activities for user ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch user activities' });
  }
};

// Get all roles
const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [{ model: Permission, as: 'permissions' }],
      order: [['role_name', 'ASC']]
    });
    
    res.status(200).json(roles);
  } catch (error) {
    logger.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
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
  getAllRoles
};
