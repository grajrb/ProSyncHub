const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
<<<<<<< HEAD
const analyticsController = require('../controllers/analyticsController');
=======
const analyticsController = require('../controllers/analyticsController.fixed');
>>>>>>> 368efa71b6c2eec7564d7f16accc1e3f5a43c8b1

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
<<<<<<< HEAD
router.get('/maintenance-costs', authenticateToken, analyticsController.getMaintenanceCosts);
=======
router.get('/maintenance-costs', authenticateToken, analyticsController.getMaintenanceCostBreakdown);
>>>>>>> 368efa71b6c2eec7564d7f16accc1e3f5a43c8b1

module.exports = router;
