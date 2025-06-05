import express from 'express';
import ChatMessage from '../models/ChatMessage';
import { requirePermission } from '../rbac';

const router = express.Router();

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Get chat messages
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by assetId
 *       - in: query
 *         name: workOrderId
 *         schema:
 *           type: string
 *         description: Filter by workOrderId
 *     responses:
 *       200:
 *         description: List of chat messages
 */
router.get('/', requirePermission('chat', 'read'), async (req, res) => {
  const { assetId, workOrderId } = req.query;
  const filter: any = {};
  if (assetId) filter.assetId = assetId;
  if (workOrderId) filter.workOrderId = workOrderId;
  const messages = await ChatMessage.find(filter).sort({ timestamp: -1 }).limit(100);
  res.json(messages);
});

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send chat message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatMessage'
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', requirePermission('chat', 'create'), async (req, res) => {
  const msg = new ChatMessage(req.body);
  await msg.save();
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.set(`chat:${msg._id}`, JSON.stringify(msg));
    req.app.locals.redisPublisher.publish('events:chat', JSON.stringify({ type: 'created', msg }));
  }
  res.status(201).json(msg);
});

/**
 * @swagger
 * /api/chat/{id}:
 *   get:
 *     summary: Get chat message by ID
 *     tags: [Chat]
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
 *         description: Chat message found
 *       404:
 *         description: Not found
 */
router.get('/:id', requirePermission('chat', 'read'), async (req, res) => {
  const id = req.params.id;
  let message = null;
  try {
    if (req.app.locals.redisPublisher) {
      const cached = await req.app.locals.redisPublisher.get(`chat:${id}`);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    }
    message = await ChatMessage.findById(id);
    if (!message) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    if (req.app.locals.redisPublisher) {
      await req.app.locals.redisPublisher.set(`chat:${id}`, JSON.stringify(message));
    }
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/chat/{id}:
 *   delete:
 *     summary: Delete chat message
 *     tags: [Chat]
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
router.delete('/:id', requirePermission('chat', 'delete'), async (req, res) => {
  await ChatMessage.findByIdAndDelete(req.params.id);
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.del(`chat:${req.params.id}`);
    req.app.locals.redisPublisher.publish('events:chat', JSON.stringify({ type: 'deleted', id: req.params.id }));
  }
  res.json({ message: 'Deleted' });
});

/**
 * @swagger
 * /api/chat/{id}:
 *   patch:
 *     summary: Edit chat message (text or readBy)
 *     tags: [Chat]
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
 *             properties:
 *               message:
 *                 type: string
 *               readBy:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Chat message updated
 */
router.patch('/:id', requirePermission('chat', 'update'), async (req, res) => {
  const message = await ChatMessage.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.set(`chat:${req.params.id}`, JSON.stringify(message));
    req.app.locals.redisPublisher.publish('events:chat', JSON.stringify({ type: 'updated', id: req.params.id, changes: req.body, message }));
  }
  res.json(message);
});

/**
 * @swagger
 * /api/chat/predictive-alerts:
 *   get:
 *     summary: Get predictive chat activity alerts
 *     tags: [Chat, Predictive]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workOrderId
 *         schema:
 *           type: string
 *         description: Filter by workOrderId
 *     responses:
 *       200:
 *         description: Predictive chat alerts
 */
router.get('/predictive-alerts', requirePermission('chat', 'read'), async (req, res) => {
  const { workOrderId } = req.query;
  const filter: any = {};
  if (workOrderId) filter.workOrderId = workOrderId;
  const messages = await ChatMessage.find(filter);
  // Example rules: inactive chat (no messages in 48h), high volume (over 20 in 1h)
  const now = Date.now();
  const alerts: any[] = [];
  if (messages.length > 0) {
    const lastMsg = messages[0];
    if (now - new Date(lastMsg.timestamp).getTime() > 1000 * 60 * 60 * 48) {
      alerts.push({ type: 'inactive', lastMessageAt: lastMsg.timestamp, workOrderId });
    }
    const oneHourAgo = now - 1000 * 60 * 60;
    const recentCount = messages.filter(m => new Date(m.timestamp).getTime() > oneHourAgo).length;
    if (recentCount > 20) {
      alerts.push({ type: 'high-volume', count: recentCount, workOrderId });
    }
  }
  res.json(alerts);
});

/**
 * @swagger
 * /api/chat/kpi:
 *   get:
 *     summary: Get chat KPIs (total messages, active users, avg response time)
 *     tags: [Chat, Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workOrderId
 *         schema:
 *           type: string
 *         description: Filter by workOrderId
 *     responses:
 *       200:
 *         description: Chat KPIs
 */
router.get('/kpi', requirePermission('chat', 'read'), async (req, res) => {
  const { workOrderId } = req.query;
  const filter: any = {};
  if (workOrderId) filter.workOrderId = workOrderId;
  const messages = await ChatMessage.find(filter);
  const totalMessages = messages.length;
  const activeUsers = Array.from(new Set(messages.map(m => m.senderId))).length;
  // Average response time (in minutes)
  let avgResponseTime = null;
  if (messages.length > 1) {
    let totalResponse = 0, count = 0;
    for (let i = 1; i < messages.length; i++) {
      const prev = new Date(messages[i - 1].timestamp).getTime();
      const curr = new Date(messages[i].timestamp).getTime();
      if (messages[i].senderId !== messages[i - 1].senderId) {
        totalResponse += Math.abs(curr - prev);
        count++;
      }
    }
    avgResponseTime = count > 0 ? Math.round(totalResponse / count / 60000) : null;
  }
  res.json({ totalMessages, activeUsers, avgResponseTime });
});

/**
 * @swagger
 * /api/chat/active-users:
 *   get:
 *     summary: Get currently active chat users
 *     tags: [Chat, Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: minutes
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Minutes of recent activity to consider (default: 10)
 *       - in: query
 *         name: workOrderId
 *         schema:
 *           type: string
 *         description: Filter by workOrderId
 *     responses:
 *       200:
 *         description: List of active users
 */
router.get('/active-users', requirePermission('chat', 'read'), async (req, res) => {
  const { minutes = 10, workOrderId } = req.query;
  const since = Date.now() - Number(minutes) * 60 * 1000;
  const filter: any = { timestamp: { $gt: new Date(since) } };
  if (workOrderId) filter.workOrderId = workOrderId;
  const messages = await ChatMessage.find(filter);
  const users = Array.from(new Set(messages.map(m => m.senderId)));
  res.json({ activeUsers: users });
});

/**
 * @swagger
 * /api/chat/stats:
 *   get:
 *     summary: Get chat message statistics (per user, per day)
 *     tags: [Chat, Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workOrderId
 *         schema:
 *           type: string
 *         description: Filter by workOrderId
 *     responses:
 *       200:
 *         description: Chat message statistics
 */
router.get('/stats', requirePermission('chat', 'read'), async (req, res) => {
  const { workOrderId } = req.query;
  const filter: any = {};
  if (workOrderId) filter.workOrderId = workOrderId;
  const messages = await ChatMessage.find(filter);
  // Per user
  const perUser: Record<string, number> = {};
  // Per day (YYYY-MM-DD)
  const perDay: Record<string, number> = {};
  messages.forEach(m => {
    perUser[m.senderId] = (perUser[m.senderId] || 0) + 1;
    const day = new Date(m.timestamp).toISOString().slice(0, 10);
    perDay[day] = (perDay[day] || 0) + 1;
  });
  res.json({ perUser, perDay });
});

export default router;
