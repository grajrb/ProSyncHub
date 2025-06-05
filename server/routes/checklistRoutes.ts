import express from 'express';
import Checklist from '../models/Checklist';
import { requirePermission } from '../rbac';

const router = express.Router();

/**
 * @swagger
 * /api/checklists:
 *   get:
 *     summary: Get checklists
 *     tags: [Checklists]
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
 *         description: List of checklists
 */
router.get('/', requirePermission('checklist', 'read'), async (req, res) => {
  const { assetId, workOrderId } = req.query;
  const filter: any = {};
  if (assetId) filter.assetId = assetId;
  if (workOrderId) filter.workOrderId = workOrderId;
  const checklists = await Checklist.find(filter).sort({ updatedAt: -1 }).limit(100);
  res.json(checklists);
});

/**
 * @swagger
 * /api/checklists:
 *   post:
 *     summary: Create checklist
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Checklist'
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', requirePermission('checklist', 'create'), async (req, res) => {
  const checklist = new Checklist(req.body);
  await checklist.save();
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.set(`checklist:${checklist._id}`, JSON.stringify(checklist));
    req.app.locals.redisPublisher.publish('events:checklists', JSON.stringify({ type: 'created', checklist }));
  }
  res.status(201).json(checklist);
});

/**
 * @swagger
 * /api/checklists/{id}:
 *   put:
 *     summary: Update checklist
 *     tags: [Checklists]
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
 *             $ref: '#/components/schemas/Checklist'
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', requirePermission('checklist', 'update'), async (req, res) => {
  const checklist = await Checklist.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.set(`checklist:${req.params.id}`, JSON.stringify(checklist));
    req.app.locals.redisPublisher.publish('events:checklists', JSON.stringify({ type: 'updated', id: req.params.id, changes: req.body, checklist }));
  }
  res.json(checklist);
});

/**
 * @swagger
 * /api/checklists/{id}:
 *   get:
 *     summary: Get checklist by ID
 *     tags: [Checklists]
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
 *         description: Checklist found
 *       404:
 *         description: Not found
 */
router.get('/:id', requirePermission('checklist', 'read'), async (req, res) => {
  // Redis cache check (if available)
  const id = req.params.id;
  let checklist = null;
  try {
    if (req.app.locals.redisPublisher) {
      const cached = await req.app.locals.redisPublisher.get(`checklist:${id}`);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    }
    checklist = await Checklist.findById(id);
    if (!checklist) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    // Cache result
    if (req.app.locals.redisPublisher) {
      await req.app.locals.redisPublisher.set(`checklist:${id}`, JSON.stringify(checklist));
    }
    res.json(checklist);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/checklists/{id}:
 *   delete:
 *     summary: Delete checklist
 *     tags: [Checklists]
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
router.delete('/:id', requirePermission('checklist', 'delete'), async (req, res) => {
  await Checklist.findByIdAndDelete(req.params.id);
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.del(`checklist:${req.params.id}`);
    req.app.locals.redisPublisher.publish('events:checklists', JSON.stringify({ type: 'deleted', id: req.params.id }));
  }
  res.json({ message: 'Deleted' });
});

/**
 * @swagger
 * /api/checklists/{id}/items/{itemIdx}:
 *   patch:
 *     summary: Mark checklist item complete/incomplete
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemIdx
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completed:
 *                 type: boolean
 *               completedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item updated
 */
router.patch('/:id/items/:itemIdx', requirePermission('checklist', 'update'), async (req, res) => {
  const { id, itemIdx } = req.params;
  const { completed, completedBy } = req.body;
  const checklist = await Checklist.findById(id);
  if (!checklist) {
    res.status(404).json({ message: 'Not found' });
    return;
  }
  if (!checklist.items[itemIdx]) {
    res.status(400).json({ message: 'Invalid item index' });
    return;
  }
  checklist.items[itemIdx].completed = completed;
  checklist.items[itemIdx].completedBy = completedBy;
  checklist.items[itemIdx].completedAt = completed ? new Date() : undefined;
  await checklist.save();
  // Invalidate cache and publish event
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.del(`checklist:${id}`);
    req.app.locals.redisPublisher.publish('events:checklists', JSON.stringify({ type: 'item-updated', id, itemIdx, completed, completedBy }));
  }
  res.json(checklist);
  return;
});

// PATCH checklist title or items (partial update)
/**
 * @swagger
 * /api/checklists/{id}:
 *   patch:
 *     summary: Partially update checklist (title or items)
 *     tags: [Checklists]
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
 *               title:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Checklist updated
 */
router.patch('/:id', requirePermission('checklist', 'update'), async (req, res) => {
  const checklist = await Checklist.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (req.app.locals.redisPublisher) {
    await req.app.locals.redisPublisher.set(`checklist:${req.params.id}`, JSON.stringify(checklist));
    req.app.locals.redisPublisher.publish('events:checklists', JSON.stringify({ type: 'patched', id: req.params.id, changes: req.body, checklist }));
  }
  res.json(checklist);
});

/**
 * @swagger
 * /api/checklists/predictive-alerts:
 *   get:
 *     summary: Get predictive maintenance alerts for checklists
 *     tags: [Checklists, Predictive]
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
 *         description: Predictive alerts
 */
router.get('/predictive-alerts', requirePermission('checklist', 'read'), async (req, res) => {
  const { assetId } = req.query;
  // Example rule-based logic: checklist overdue or too many incomplete items
  const filter: any = {};
  if (assetId) filter.assetId = assetId;
  const checklists = await Checklist.find(filter);
  const alerts = checklists.flatMap(cl => {
    const incomplete = cl.items.filter((i: any) => !i.completed).length;
    const overdue = cl.updatedAt && (Date.now() - new Date(cl.updatedAt).getTime() > 1000 * 60 * 60 * 24 * 7); // 7 days
    const result = [];
    if (incomplete > 3) result.push({ checklistId: cl._id, type: 'too-many-incomplete', count: incomplete });
    if (overdue) result.push({ checklistId: cl._id, type: 'overdue', lastUpdated: cl.updatedAt });
    return result;
  });
  res.json(alerts);
});

/**
 * @swagger
 * /api/checklists/analytics:
 *   get:
 *     summary: Get checklist analytics (per type, per day, per status)
 *     tags: [Checklists, Analytics]
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
 *         description: Checklist analytics
 */
router.get('/analytics', requirePermission('checklist', 'read'), async (req, res) => {
  const { assetId } = req.query;
  const filter = assetId ? { assetId } : {};
  const checklists = await Checklist.find(filter);
  // Per type
  const perType: { [key: string]: number } = {};
  // Per day (YYYY-MM-DD)
  const perDay: { [key: string]: number } = {};
  // Per status
  const perStatus: { [key: string]: number } = {};
  checklists.forEach(cl => {
    const type = String(cl.type);
    if (type) perType[type] = (perType[type] || 0) + 1;
    const day = new Date(cl.updatedAt || cl.createdAt).toISOString().slice(0, 10);
    perDay[day] = (perDay[day] || 0) + 1;
    const status = String(cl.status);
    if (status) perStatus[status] = (perStatus[status] || 0) + 1;
  });
  res.json({ perType, perDay, perStatus });
});

export default router;
