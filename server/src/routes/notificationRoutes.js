const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Get user notifications
router.get('/users/:user_id', authenticateToken, notificationController.getUserNotifications);

// Mark notification as read
router.put('/:id/read', authenticateToken, notificationController.markNotificationAsRead);

// Mark all notifications as read for a user
router.put('/users/:user_id/read-all', authenticateToken, notificationController.markAllNotificationsAsRead);

// Create notification for a user
router.post('/', authenticateToken, notificationController.createNotification);

// Create notification for multiple users
router.post('/bulk', authenticateToken, notificationController.createBulkNotifications);

// Delete notification
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

module.exports = router;
