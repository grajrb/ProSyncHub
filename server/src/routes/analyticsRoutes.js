const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController.fixed');

// Get dashboard statistics
router.get('/dashboard', authenticateToken, analyticsController.getDashboardStats);

// Get asset health trends
router.get('/asset-health', authenticateToken, analyticsController.getAssetHealthTrends);

// Get work order statistics
router.get('/work-orders', authenticateToken, analyticsController.getWorkOrderStats);

// Get maintenance efficiency metrics
router.get('/maintenance-efficiency', authenticateToken, analyticsController.getMaintenanceEfficiency);

// Get asset uptime statistics
router.get('/asset-uptime', authenticateToken, analyticsController.getAssetUptime);

// Get sensor data trends for an asset or group
router.get('/sensor-trends', authenticateToken, analyticsController.getSensorTrends);

// Get alert statistics
router.get('/alerts', authenticateToken, analyticsController.getAlertStats);

// Get predicted failures
router.get('/predicted-failures', authenticateToken, analyticsController.getPredictedFailures);

// Get maintenance cost breakdown
router.get('/maintenance-costs', authenticateToken, analyticsController.getMaintenanceCostBreakdown);

module.exports = router;
