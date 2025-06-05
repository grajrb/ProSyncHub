import express, { Response, NextFunction } from 'express';
import EventLog from '../models/EventLog';
import { requirePermission } from '../rbac';
import { AuthRequest } from '../authMiddleware';

const router = express.Router();

/**
 * @swagger
 * /api/event-logs:
 *   get:
 *     summary: Get event logs
 *     tags: [EventLogs]
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
 *         description: List of event logs
 */
router.get('/', requirePermission('eventlog', 'read'), async (req, res, next) => {
  const { assetId } = req.query;
  const filter: any = assetId ? { assetId } : {};
  const logs = await EventLog.find(filter).sort({ timestamp: -1 }).limit(1000);
  res.json(logs);
});

/**
 * @swagger
 * /api/event-logs:
 *   post:
 *     summary: Create event log
 *     tags: [EventLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventLog'
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', requirePermission('eventlog', 'create'), async (req, res, next) => {
  const log = new EventLog(req.body);
  await log.save();
  // Publish to Redis and broadcast to WebSocket clients
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.set(`eventlog:${log._id}`, JSON.stringify(log));
    req.app.locals.redisPublisher.publish('events:eventlogs', JSON.stringify({ type: 'created', log }));
  }
  res.status(201).json(log);
});

/**
 * @swagger
 * /api/event-logs/{id}:
 *   get:
 *     summary: Get event log by ID
 *     tags: [EventLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event log found
 *       404:
 *         description: Not found
 */
router.get('/:id', requirePermission('eventlog', 'read'), async (req, res, next) => {
  const id = req.params.id;
  let eventLog = null;
  if (req.app.locals.redisPublisher) {
    const cached = await req.app.locals.redisPublisher.get(`eventlog:${id}`);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }
  }
  eventLog = await EventLog.findById(id);
  if (!eventLog) {
    res.status(404).json({ message: 'Not found' });
    return;
  }
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.set(`eventlog:${id}`, JSON.stringify(eventLog));
  }
  res.json(eventLog);
});

/**
 * @swagger
 * /api/event-logs/{id}:
 *   delete:
 *     summary: Delete event log
 *     tags: [EventLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', requirePermission('eventlog', 'delete'), async (req, res, next) => {
  await EventLog.findByIdAndDelete(req.params.id);
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.del(`eventlog:${req.params.id}`);
    req.app.locals.redisPublisher.publish('eventlog-events', JSON.stringify({ type: 'deleted', id: req.params.id }));
  }
  res.json({ message: 'Deleted' });
});

/**
 * @swagger
 * /api/event-logs/{id}:
 *   patch:
 *     summary: Update event log (partial)
 *     tags: [EventLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Event log updated
 */
router.patch('/:id', requirePermission('eventlog', 'update'), async (req, res, next) => {
  const eventLog = await EventLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.set(`eventlog:${req.params.id}`, JSON.stringify(eventLog));
    req.app.locals.redisPublisher.publish('events:eventlogs', JSON.stringify({ type: 'updated', id: req.params.id, changes: req.body, eventLog }));
  }
  res.json(eventLog);
});

/**
 * @swagger
 * /api/event-logs/analytics:
 *   get:
 *     summary: Get event log analytics (per type, per day, per severity, per asset)
 *     tags: [EventLogs, Analytics]
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
 *         description: Event log analytics
 */
// Enhanced analytics endpoint: add trend analysis and moving average for event spikes
router.get('/analytics', requirePermission('eventlog', 'read'), async (req, res) => {
  const { assetId } = req.query;
  const filter = assetId ? { assetId } : {};
  const logs = await EventLog.find(filter);
  // Per type
  const perType: { [key: string]: number } = {};
  // Per day (YYYY-MM-DD)
  const perDay: { [key: string]: number } = {};
  // Per severity
  const perSeverity: { [key: string]: number } = {};
  // Per asset
  const perAsset: { [key: string]: number } = {};
  // For trend analysis: count per day (last 30 days)
  const now = new Date();
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    return d.toISOString().slice(0, 10);
  }).reverse();
  const trend = last30Days.map(day => ({
    day,
    count: 0
  }));
  logs.forEach(l => {
    if (l.eventType) perType[l.eventType] = (perType[l.eventType] || 0) + 1;
    const day = new Date(l.timestamp).toISOString().slice(0, 10);
    perDay[day] = (perDay[day] || 0) + 1;
    if (l.severity) perSeverity[l.severity] = (perSeverity[l.severity] || 0) + 1;
    if (l.assetId) perAsset[l.assetId] = (perAsset[l.assetId] || 0) + 1;
    // Trend
    const trendIdx = trend.findIndex(t => t.day === day);
    if (trendIdx !== -1) trend[trendIdx].count++;
  });
  // Moving average (window=3 days)
  const movingAvg = trend.map((_, i, arr) => {
    const window = arr.slice(Math.max(0, i - 2), i + 1);
    const avg = window.reduce((sum, t) => sum + t.count, 0) / window.length;
    return { day: arr[i].day, movingAvg: Math.round(avg * 100) / 100 };
  });
  res.json({ perType, perDay, perSeverity, perAsset, trend, movingAvg });
});

/**
 * @swagger
 * /api/event-logs/predictive-alerts:
 *   get:
 *     summary: Get predictive event log alerts
 *     tags: [EventLogs, Predictive]
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
 *         description: Predictive event log alerts
 */
// Enhanced predictive alerts: anomaly detection (spike if count > 2x moving average)
router.get('/predictive-alerts', requirePermission('eventlog', 'read'), async (req, res) => {
  const { assetId } = req.query;
  const filter = assetId ? { assetId } : {};
  const logs = await EventLog.find(filter);
  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    return d.toISOString().slice(0, 10);
  }).reverse();
  const dailyCounts = last7Days.map(day => logs.filter(l => new Date(l.timestamp).toISOString().slice(0, 10) === day).length);
  const avg = dailyCounts.slice(0, 6).reduce((a, b) => a + b, 0) / 6 || 0;
  const todayCount = dailyCounts[6];
  const alerts = [];
  if (avg > 0 && todayCount > 2 * avg) {
    alerts.push({ type: 'anomaly-spike', message: `Event count today (${todayCount}) is more than double the 6-day average (${avg.toFixed(2)})`, assetId });
  }
  // Existing critical spike logic
  const oneDayAgo = now.getTime() - 1000 * 60 * 60 * 24;
  const criticals = logs.filter(l => l.eventType === 'critical' && new Date(l.timestamp).getTime() > oneDayAgo);
  if (criticals.length > 5) {
    alerts.push({ type: 'critical-spike', count: criticals.length, assetId });
  }
  res.json(alerts);
});

export default router;
