const mongoose = require('mongoose');
const { User } = require('../models');
const { redisClient } = require('../config/redisConfig');
const winston = require('winston');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'notification-controller' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'notification-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'notification.log' })
  ]
});

// Define Notification Schema if not already defined
let Notification;
try {
  Notification = mongoose.model('Notification');
} catch (error) {
  const NotificationSchema = new mongoose.Schema({
    user_id: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['INFO', 'WARNING', 'ALERT', 'ERROR', 'SUCCESS'],
      default: 'INFO'
    },
    is_read: {
      type: Boolean,
      default: false
    },
    related_id: {
      type: String,
      default: null
    },
    related_type: {
      type: String,
      default: null
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  });
  
  // Create index for sorting
  NotificationSchema.index({ user_id: 1, created_at: -1 });
  
  Notification = mongoose.model('Notification', NotificationSchema);
}

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { page = 1, limit = 20, unread_only = false } = req.query;
    
    // Build query
    const query = { user_id };
    
    if (unread_only === 'true') {
      query.is_read = false;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get notifications with count
    const count = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({
      user_id,
      is_read: false
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      notifications,
      unread_count: unreadCount,
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
    logger.error(`Error fetching notifications for user ID ${req.params.user_id}:`, error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Verify user owns the notification
    if (notification.user_id !== req.user.user_id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Update notification
    await Notification.findByIdAndUpdate(id, { is_read: true });
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error(`Error marking notification as read ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read for a user
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Verify user owns the notifications or is admin
    if (user_id !== req.user.user_id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Update all notifications
    const result = await Notification.updateMany(
      { user_id, is_read: false },
      { is_read: true }
    );
    
    res.status(200).json({ 
      message: 'All notifications marked as read',
      count: result.nModified
    });
  } catch (error) {
    logger.error(`Error marking all notifications as read for user ID ${req.params.user_id}:`, error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

// Create notification for a user
const createNotification = async (req, res) => {
  try {
    const { user_id, title, message, type, related_id, related_type } = req.body;
    
    // Verify user exists
    const user = await User.findByPk(user_id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create notification
    const notification = await Notification.create({
      user_id,
      title,
      message,
      type: type || 'INFO',
      related_id,
      related_type
    });
    
    // Publish to Redis for real-time notification
    try {
      await redisClient.publish('notifications', JSON.stringify({
        event: 'new_notification',
        notification
      }));
    } catch (redisError) {
      logger.error('Error publishing notification to Redis:', redisError);
    }
    
    res.status(201).json(notification);
  } catch (error) {
    logger.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

// Create notification for multiple users
const createBulkNotifications = async (req, res) => {
  try {
    const { user_ids, title, message, type, related_id, related_type } = req.body;
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'Invalid user IDs' });
    }
    
    // Verify users exist
    const users = await User.findAll({
      where: {
        user_id: user_ids
      }
    });
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'No users found' });
    }
    
    // Create notifications
    const notifications = [];
    
    for (const user of users) {
      const notification = await Notification.create({
        user_id: user.user_id,
        title,
        message,
        type: type || 'INFO',
        related_id,
        related_type
      });
      
      notifications.push(notification);
      
      // Publish to Redis for real-time notification
      try {
        await redisClient.publish('notifications', JSON.stringify({
          event: 'new_notification',
          notification
        }));
      } catch (redisError) {
        logger.error('Error publishing notification to Redis:', redisError);
      }
    }
    
    res.status(201).json({
      message: `Created ${notifications.length} notifications`,
      notifications
    });
  } catch (error) {
    logger.error('Error creating bulk notifications:', error);
    res.status(500).json({ error: 'Failed to create notifications' });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Verify user owns the notification or is admin
    if (notification.user_id !== req.user.user_id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Delete notification
    await Notification.findByIdAndDelete(id);
    
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    logger.error(`Error deleting notification ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Utility function to create notification (for internal use)
const createNotificationInternal = async (userData) => {
  try {
    const { user_id, title, message, type, related_id, related_type } = userData;
    
    // Create notification
    const notification = await Notification.create({
      user_id,
      title,
      message,
      type: type || 'INFO',
      related_id,
      related_type
    });
    
    // Publish to Redis for real-time notification
    try {
      await redisClient.publish('notifications', JSON.stringify({
        event: 'new_notification',
        notification
      }));
    } catch (redisError) {
      logger.error('Error publishing notification to Redis:', redisError);
    }
    
    return notification;
  } catch (error) {
    logger.error('Error creating internal notification:', error);
    throw error;
  }
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  createBulkNotifications,
  deleteNotification,
  createNotificationInternal
};
