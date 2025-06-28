const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
<<<<<<< HEAD
const userController = require('../controllers/userController');
=======
const userController = require('../controllers/userController.fixed');
>>>>>>> 368efa71b6c2eec7564d7f16accc1e3f5a43c8b1

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
