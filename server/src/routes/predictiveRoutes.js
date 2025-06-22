const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const predictiveController = require('../controllers/predictiveController');

// Analyze health for a specific asset
router.get('/assets/:id/analyze', authenticateToken, predictiveController.analyzeAssetHealth);

// Run predictive maintenance scan for all assets
router.post('/scan', authenticateToken, predictiveController.runPredictiveScan);

// Generate maintenance work orders based on predictive scan
router.post('/work-orders/generate', authenticateToken, predictiveController.generateMaintenanceWorkOrders);

module.exports = router;
