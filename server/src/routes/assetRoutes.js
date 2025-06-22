const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const assetController = require('../controllers/assetController');

// Get all assets (with pagination and filtering)
router.get('/', authenticateToken, assetController.getAllAssets);

// Get asset by ID
router.get('/:id', authenticateToken, assetController.getAssetById);

// Create new asset
router.post('/', authenticateToken, assetController.createAsset);

// Update asset
router.put('/:id', authenticateToken, assetController.updateAsset);

// Delete asset
router.delete('/:id', authenticateToken, assetController.deleteAsset);

// Get asset sensor readings (recent or by time range)
router.get('/:id/sensor-readings', authenticateToken, assetController.getAssetSensorReadings);

// Get asset events/logs
router.get('/:id/events', authenticateToken, assetController.getAssetEvents);

// Get work orders for asset
router.get('/:id/work-orders', authenticateToken, assetController.getAssetWorkOrders);

// Get maintenance schedules for asset
router.get('/:id/maintenance-schedules', authenticateToken, assetController.getAssetMaintenanceSchedules);

// Generate QR code for asset
router.get('/:id/qr-code', authenticateToken, assetController.generateAssetQRCode);

// Get asset health score history
router.get('/:id/health-history', authenticateToken, assetController.getAssetHealthHistory);

module.exports = router;
