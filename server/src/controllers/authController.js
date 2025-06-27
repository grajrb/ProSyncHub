const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-controller' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'auth-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'auth.log' })
  ]
});

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role.role_name
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1d' }
  );
};

// Generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { user_id: user.user_id },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: '7d' }
  );
};

// Register new user
const register = async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, role_id } = req.body;
    
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
    
    // Find role (default to basic user if not specified)
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
      status: 'ACTIVE'
    });
    
    // Load user with role
    const user = await User.findByPk(newUser.user_id, {
      include: [{ model: Role, as: 'role' }]
    });
    
    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Return user and tokens
    res.status(201).json({
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: {
          role_id: user.role.role_id,
          role_name: user.role.role_name
        },
        status: user.status,
        created_at: user.created_at
      },
      token,
      refreshToken
    });
    
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [{ username }, { email: username }]
      },
      include: [{ model: Role, as: 'role' }]
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Account is inactive or locked' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Update last login
    await user.update({ last_login: new Date() });
    
    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Return user and tokens
    res.status(200).json({
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: {
          role_id: user.role.role_id,
          role_name: user.role.role_name,
          color: user.role.color
        },
        status: user.status,
        last_login: user.last_login
      },
      token,
      refreshToken
    });
    
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
    );
    
    // Find user
    const user = await User.findByPk(decoded.user_id, {
      include: [{ model: Role, as: 'role' }]
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Account is inactive or locked' });
    }
    
    // Generate new access token
    const newToken = generateToken(user);
    
    // Return new access token
    res.status(200).json({
      token: newToken
    });
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired. Please login again.' });
    }
    
    logger.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// Logout
const logout = async (req, res) => {
  // JWT tokens are stateless, so we don't need to do anything server-side
  // The client should remove the tokens from storage
  res.status(200).json({ message: 'Logged out successfully' });
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    // User is already attached to req by the auth middleware
    const user = req.user;
    
    res.status(200).json({
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: {
          role_id: user.role.role_id,
          role_name: user.role.role_name,
          color: user.role.color
        },
        status: user.status,
        last_login: user.last_login
      }
    });
    
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({ error: 'Server error while fetching user profile' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.user_id;
    
    // Find user
    const user = await User.findByPk(userId);
    
    // Check current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await user.update({ password_hash: hashedPassword });
    
    res.status(200).json({ message: 'Password changed successfully' });
    
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Server error while changing password' });
  }
};

// Request password reset
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      // For security, don't reveal that the email doesn't exist
      return res.status(200).json({ message: 'If your email exists in our system, you will receive a reset link shortly' });
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_RESET_SECRET || 'your-reset-secret-key',
      { expiresIn: '1h' }
    );
    
    // In a real application, send email with reset link
    // For this example, we'll just return the token
    
    res.status(200).json({
      message: 'If your email exists in our system, you will receive a reset link shortly',
      // Only include this in development
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
    
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error while processing password reset' });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    // Verify reset token
    const decoded = jwt.verify(
      resetToken,
      process.env.JWT_RESET_SECRET || 'your-reset-secret-key'
    );
    
    // Find user
    const user = await User.findByPk(decoded.user_id);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await user.update({ password_hash: hashedPassword });
    
    res.status(200).json({ message: 'Password reset successful' });
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    
    logger.error('Reset password error:', error);
    res.status(400).json({ error: 'Invalid reset token' });
  }
};

// Get user permissions
const getUserPermissions = async (req, res) => {
  try {
    // User is already attached to req by the auth middleware
    const user = req.user;
    
    // Get permissions from role
    const permissions = user.role.permissions.map(p => p.permission_name);
    
    res.status(200).json({ permissions });
    
  } catch (error) {
    logger.error('Get user permissions error:', error);
    res.status(500).json({ error: 'Server error while fetching permissions' });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  changePassword,
  forgotPassword,
  resetPassword,
  getUserPermissions
};
