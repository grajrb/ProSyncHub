const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Register a new user (admin only, handled separately)
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Logout
router.post('/logout', authenticateToken, authController.logout);

// Get current user profile
router.get('/me', authenticateToken, authController.getCurrentUser);

// Change password
router.post('/change-password', authenticateToken, authController.changePassword);

// Request password reset
router.post('/forgot-password', authController.forgotPassword);

// Reset password with token
router.post('/reset-password', authController.resetPassword);

// Get user permissions
router.get('/permissions', authenticateToken, authController.getUserPermissions);

module.exports = router;
