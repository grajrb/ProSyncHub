import express from 'express';
import { requirePermission } from '../rbac';
import { Types } from 'mongoose';
import Notification from '../models/Notification';

const router = express.Router();

// Helper to wrap async route handlers for Express
function asyncHandler(fn: (...args: any[]) => Promise<any>) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by userId
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get(
  '/',
  requirePermission('notification', 'read'),
  asyncHandler(async (req, res) => {
    const { userId } = req.query;
    const filter: any = userId ? { userId } : {};
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notifications);
  })
);

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/',
  requirePermission('notification', 'create'),
  asyncHandler(async (req, res) => {
    const notification = new Notification(req.body);
    await notification.save();
    if (req.app.locals.redisPublisher) {
      await req.app.locals.redisPublisher.set(
        `notification:${notification._id}`,
        JSON.stringify(notification)
      );
      req.app.locals.redisPublisher.publish(
        'events:notifications',
        JSON.stringify({ type: 'created', notification })
      );
    }
    res.status(201).json(notification);
  })
);

/**
 * @swagger
 * /api/notifications/{id}:
 *   patch:
 *     summary: Update notification (partial)
 *     tags: [Notifications]
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
 *         description: Notification updated
 */
router.patch(
  '/:id',
  requirePermission('notification', 'update'),
  asyncHandler(async (req, res) => {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (req.app.locals.redisPublisher) {
      await req.app.locals.redisPublisher.set(
        `notification:${req.params.id}`,
        JSON.stringify(notification)
      );
      req.app.locals.redisPublisher.publish(
        'events:notifications',
        JSON.stringify({
          type: 'updated',
          id: req.params.id,
          changes: req.body,
          notification,
        })
      );
    }
    res.json(notification);
  })
);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
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
router.delete(
  '/:id',
  requirePermission('notification', 'delete'),
  asyncHandler(async (req, res) => {
    await Notification.findByIdAndDelete(req.params.id);
    if (req.app.locals.redisPublisher) {
      await req.app.locals.redisPublisher.del(`notification:${req.params.id}`);
      req.app.locals.redisPublisher.publish(
        'events:notifications',
        JSON.stringify({ type: 'deleted', id: req.params.id })
      );
    }
    res.json({ message: 'Deleted' });
  })
);

/**
 * @swagger
 * /api/notifications/analytics:
 *   get:
 *     summary: Get notification analytics (per type, per day)
 *     tags: [Notifications, Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by userId
 *     responses:
 *       200:
 *         description: Notification analytics
 */
router.get(
  '/analytics',
  requirePermission('notification', 'read'),
  asyncHandler(async (req, res) => {
    const { userId } = req.query;
    const filter: any = userId ? { userId } : {};
    const notifications = await Notification.find(filter);
    // Per type
    const perType: Record<string, number> = {};
    // Per day (YYYY-MM-DD)
    const perDay: Record<string, number> = {};
    notifications.forEach(n => {
      perType[n.type] = (perType[n.type] || 0) + 1;
      const day = new Date(n.createdAt).toISOString().slice(0, 10);
      perDay[day] = (perDay[day] || 0) + 1;
    });
    res.json({ perType, perDay });
  })
);

export default router;
