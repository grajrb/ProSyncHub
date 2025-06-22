const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const userController = require('../controllers/userController');

// Get all users (admin only)
router.get('/', authenticateToken, authorizeRole(['Administrator', 'Supervisor']), userController.getAllUsers);

// Get user by ID
router.get('/:id', authenticateToken, userController.getUserById);

// Create new user (admin only)
router.post('/', authenticateToken, authorizeRole(['Administrator']), userController.createUser);

// Update user
router.put('/:id', authenticateToken, userController.updateUser);

// Delete user (admin only)
router.delete('/:id', authenticateToken, authorizeRole(['Administrator']), userController.deleteUser);

// Get user's work orders
router.get('/:id/work-orders', authenticateToken, userController.getUserWorkOrders);

// Get user's activity feed
router.get('/:id/activity', authenticateToken, userController.getUserActivity);

// Update user's role (admin only)
router.put('/:id/role', authenticateToken, authorizeRole(['Administrator']), userController.updateUserRole);

// Change user's status (active/inactive)
router.put('/:id/status', authenticateToken, authorizeRole(['Administrator']), userController.updateUserStatus);

module.exports = router;
