import express from 'express';
import { requirePermission } from '../rbac';

const router = express.Router();

/**
 * @swagger
 * /api/analytics/kpi:
 *   get:
 *     summary: Get KPIs (MTBF, MTTR, cost, etc.)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by assetId
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date
 *     responses:
 *       200:
 *         description: KPIs retrieved
 */
router.get('/kpi', requirePermission('analytics', 'read'), async (req, res) => {
  const { assetId, startDate, endDate } = req.query;
  // Fetch work orders and maintenance records for the asset and date range
  const filter: any = {};
  if (assetId) filter.assetId = assetId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate as string);
    if (endDate) filter.createdAt.$lte = new Date(endDate as string);
  }
  // Use WorkOrder and MaintenanceSchedule models
  const WorkOrder = require('../models/WorkOrder').default;
  const MaintenanceSchedule = require('../models/MaintenanceSchedule').default;
  const workOrders: any[] = await WorkOrder.find(filter);
  const maints: any[] = await MaintenanceSchedule.find(filter);

  // Calculate MTBF (mean time between failures)
  let mtbf: number | null = null;
  if (workOrders.length > 1) {
    const sorted = workOrders.filter((w: any) => w.closedAt).sort((a: any, b: any) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime());
    let total = 0;
    for (let i = 1; i < sorted.length; i++) {
      total += new Date(sorted[i].closedAt).getTime() - new Date(sorted[i - 1].closedAt).getTime();
    }
    mtbf = total / (sorted.length - 1) / (1000 * 60 * 60); // hours
    mtbf = Math.round(mtbf * 100) / 100;
  }

  // Calculate MTTR (mean time to repair)
  let mttr: number | null = null;
  if (workOrders.length > 0) {
    const total = workOrders.reduce((sum: number, w: any) => {
      if (w.closedAt && w.createdAt) {
        return sum + (new Date(w.closedAt).getTime() - new Date(w.createdAt).getTime());
      }
      return sum;
    }, 0);
    mttr = total / workOrders.length / (1000 * 60 * 60); // hours
    mttr = Math.round(mttr * 100) / 100;
  }

  // Calculate total cost (sum of work order costs)
  const totalCost = workOrders.reduce((sum: number, w: any) => sum + (w.cost || 0), 0);

  // Calculate downtime (sum of downtime for all work orders)
  const downtime = workOrders.reduce((sum: number, w: any) => sum + (w.downtimeHours || 0), 0);

  res.json({ mtbf, mttr, totalCost, downtime });
});

/**
 * @swagger
 * /api/analytics/mtbf:
 *   get:
 *     summary: Get Mean Time Between Failures (MTBF)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by assetId
 *     responses:
 *       200:
 *         description: MTBF value
 */
router.get('/mtbf', requirePermission('analytics', 'read'), async (req, res) => {
  const { assetId } = req.query;
  const WorkOrder = require('../models/WorkOrder').default;
  const filter: any = assetId ? { assetId } : {};
  const workOrders: any[] = await WorkOrder.find(filter);
  let mtbf: number | null = null;
  if (workOrders.length > 1) {
    const sorted = workOrders.filter((w: any) => w.closedAt).sort((a: any, b: any) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime());
    let total = 0;
    for (let i = 1; i < sorted.length; i++) {
      total += new Date(sorted[i].closedAt).getTime() - new Date(sorted[i - 1].closedAt).getTime();
    }
    mtbf = total / (sorted.length - 1) / (1000 * 60 * 60);
    mtbf = Math.round(mtbf * 100) / 100;
  }
  res.json({ mtbf });
});

/**
 * @swagger
 * /api/analytics/mttr:
 *   get:
 *     summary: Get Mean Time To Repair (MTTR)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by assetId
 *     responses:
 *       200:
 *         description: MTTR value
 */
router.get('/mttr', requirePermission('analytics', 'read'), async (req, res) => {
  const { assetId } = req.query;
  const WorkOrder = require('../models/WorkOrder').default;
  const filter: any = assetId ? { assetId } : {};
  const workOrders: any[] = await WorkOrder.find(filter);
  let mttr: number | null = null;
  if (workOrders.length > 0) {
    const total = workOrders.reduce((sum: number, w: any) => {
      if (w.closedAt && w.createdAt) {
        return sum + (new Date(w.closedAt).getTime() - new Date(w.createdAt).getTime());
      }
      return sum;
    }, 0);
    mttr = total / workOrders.length / (1000 * 60 * 60);
    mttr = Math.round(mttr * 100) / 100;
  }
  res.json({ mttr });
});

/**
 * @swagger
 * /api/analytics/cost-reports:
 *   get:
 *     summary: Get cost reports
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by assetId
 *     responses:
 *       200:
 *         description: Cost report
 */
router.get('/cost-reports', requirePermission('analytics', 'read'), async (req, res) => {
  const { assetId } = req.query;
  const WorkOrder = require('../models/WorkOrder').default;
  const filter: any = assetId ? { assetId } : {};
  const workOrders: any[] = await WorkOrder.find(filter);
  const totalCost = workOrders.reduce((sum: number, w: any) => sum + (w.cost || 0), 0);
  res.json({ totalCost });
});

/**
 * @swagger
 * /api/predictive/maintenance:
 *   get:
 *     summary: Get predictive maintenance alerts
 *     tags: [Predictive]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by assetId
 *     responses:
 *       200:
 *         description: Predictive maintenance alerts
 */
router.get('/predictive/maintenance', requirePermission('predictive', 'read'), async (req, res) => {
  const { assetId } = req.query;
  const MaintenanceSchedule = require('../models/MaintenanceSchedule').default;
  const filter: any = assetId ? { assetId } : {};
  const maints: any[] = await MaintenanceSchedule.find(filter);
  // Example: Predictive alert if nextDueDate is within 7 days
  const now = Date.now();
  const alerts = maints.flatMap((m: any) => {
    if (m.nextDueDate && new Date(m.nextDueDate).getTime() - now < 7 * 24 * 60 * 60 * 1000) {
      return [{ assetId: m.assetId, type: 'maintenance-due-soon', severity: 'high', message: `Maintenance due on ${m.nextDueDate}` }];
    }
    return [];
  });
  res.json(alerts);
});

export default router;
