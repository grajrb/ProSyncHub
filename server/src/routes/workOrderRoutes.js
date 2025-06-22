const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const workOrderController = require('../controllers/workOrderController');

// Get all work orders (with pagination and filtering)
router.get('/', authenticateToken, workOrderController.getAllWorkOrders);

// Get work order by ID
router.get('/:id', authenticateToken, workOrderController.getWorkOrderById);

// Create new work order
router.post('/', authenticateToken, workOrderController.createWorkOrder);

// Update work order
router.put('/:id', authenticateToken, workOrderController.updateWorkOrder);

// Delete work order
router.delete('/:id', authenticateToken, workOrderController.deleteWorkOrder);

// Assign work order to user
router.post('/:id/assign', authenticateToken, workOrderController.assignWorkOrder);

// Update work order status
router.put('/:id/status', authenticateToken, workOrderController.updateWorkOrderStatus);

// Add comment to work order
router.post('/:id/comments', authenticateToken, workOrderController.addWorkOrderComment);

// Get comments for work order
router.get('/:id/comments', authenticateToken, workOrderController.getWorkOrderComments);

// Add parts to work order
router.post('/:id/parts', authenticateToken, workOrderController.addWorkOrderParts);

// Get parts for work order
router.get('/:id/parts', authenticateToken, workOrderController.getWorkOrderParts);

// Get checklist for work order
router.get('/:id/checklist', authenticateToken, workOrderController.getWorkOrderChecklist);

// Create or update checklist for work order
router.post('/:id/checklist', authenticateToken, workOrderController.updateWorkOrderChecklist);

module.exports = router;
