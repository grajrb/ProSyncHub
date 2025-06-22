const jwt = require('jsonwebtoken');
const { User, Role, Permission } = require('../models');

// Authenticate token middleware
const authenticateToken = async (req, res, next) => {
  try {
    // Get auth header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Find user
    const user = await User.findOne({
      where: { user_id: decoded.user_id },
      include: [{
        model: Role,
        as: 'role',
        include: [{
          model: Permission,
          as: 'permissions'
        }]
      }]
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }
    
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is inactive or locked.' });
    }
    
    // Add user object to request
    req.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// Authorize role middleware
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. User not authenticated.' });
    }
    
    if (!roles.includes(req.user.role.role_name)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
    
    next();
  };
};

// Authorize permission middleware
const authorizePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. User not authenticated.' });
    }
    
    const userPermissions = req.user.role.permissions.map(p => p.permission_name);
    
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole,
  authorizePermission
};
