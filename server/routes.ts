import type { Express } from "express";
import { createServer, type Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { DatabaseStorage } from "./storage";
import { insertAssetSchema, insertWorkOrderSchema, insertMaintenanceScheduleSchema, insertNotificationSchema, insertAssetSensorReadingSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateJWT, authorizeRoles, AuthRequest } from './authMiddleware.js';
import assetCacheService from './services/assetCacheService';

/**
 * @openapi
 * /api/assets:
 *   get:
 *     summary: Get a list of assets
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filter by location ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by asset status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of assets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Asset'
 *   post:
 *     summary: Create a new asset
 *     tags:
 *       - Assets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetInput'
 *     responses:
 *       201:
 *         description: Asset created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       400:
 *         description: Invalid asset data
 *
 * /api/assets/{id}:
 *   get:
 *     summary: Get asset by ID
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       404:
 *         description: Asset not found
 *   put:
 *     summary: Update asset by ID
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetInput'
 *     responses:
 *       200:
 *         description: Asset updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       400:
 *         description: Invalid asset data
 *       404:
 *         description: Asset not found
 *   delete:
 *     summary: Delete asset by ID
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     responses:
 *       204:
 *         description: Asset deleted
 *       404:
 *         description: Asset not found
 *
 * components:
 *   schemas:
 *     Asset:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         assetTag:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         model:
 *           type: string
 *         manufacturer:
 *           type: string
 *         serialNumber:
 *           type: string
 *         installationDate:
 *           type: string
 *           format: date
 *         locationId:
 *           type: integer
 *         assetTypeId:
 *           type: integer
 *         parentAssetId:
 *           type: integer
 *           nullable: true
 *         documentationUrl:
 *           type: string
 *         qrCodePath:
 *           type: string
 *         currentStatus:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     AssetInput:
 *       type: object
 *       properties:
 *         assetTag:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         model:
 *           type: string
 *         manufacturer:
 *           type: string
 *         serialNumber:
 *           type: string
 *         installationDate:
 *           type: string
 *           format: date
 *         locationId:
 *           type: integer
 *         assetTypeId:
 *           type: integer
 *         parentAssetId:
 *           type: integer
 *           nullable: true
 *         documentationUrl:
 *           type: string
 *         qrCodePath:
 *           type: string
 *         currentStatus:
 *           type: string
 */

import type { Server as HttpServer } from "http";

let wss: WebSocketServer | undefined;

// Broadcast helper
export function broadcastToClients(message: any) {
  if (!wss) return;
  const data = JSON.stringify(message);
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
  
  // Also publish to Redis for distributed architectures
  try {
    const { publishToChannel } = require('./services/websocketService').default;
    if (message.type) {
      let channel = 'events:global';
      
      // Route message to appropriate channel based on type
      if (message.type.startsWith('ASSET_')) {
        channel = 'events:assets';
      } else if (message.type.startsWith('SENSOR_')) {
        channel = 'events:sensors';
      } else if (message.type.startsWith('WORK_ORDER_')) {
        channel = 'events:workorders';
      } else if (message.type.startsWith('MAINTENANCE_')) {
        channel = 'events:maintenance';
      } else if (message.type === 'NOTIFICATION') {
        channel = 'events:notifications';
      }
      
      publishToChannel(channel, message).catch(console.error);
    }
  } catch (error) {
    // Silently fail if the websocket service is not yet available
    // This handles circular dependency issues
  }
}

// Helper to wrap async route handlers for Express
function asyncHandler(fn: (...args: any[]) => Promise<any>) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export async function registerRoutes(app: Express): Promise<HttpServer> {
  // Protect all API routes by default
  app.use(authenticateJWT as any);

  const server = createServer(app);

  // Initialize WebSocket server
  wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (msg: WebSocket.RawData) => {
      // Optionally handle incoming messages from clients
    });
  });
  
  // Initialize the websocket service with Redis integration
  try {
    const websocketService = require('./services/websocketService').default;
    websocketService.initializeWebSocketServer(server);
  } catch (error) {
    console.error('Error initializing websocket service:', error);
  }

  // RBAC: Restrict asset CRUD endpoints
  app.get('/api/assets', authorizeRoles('admin', 'supervisor', 'technician', 'operator') as any, asyncHandler(async (req: AuthRequest, res) => {
    const filters = {
      locationId: req.query.locationId ? parseInt(req.query.locationId as string) : undefined,
      status: req.query.status as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };
    const assets = await storage.getAssets(filters);
    res.json(assets);
  }));

  app.post('/api/assets', authorizeRoles('admin', 'supervisor') as any, asyncHandler(async (req: AuthRequest, res) => {
    const parsed = insertAssetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid asset data', errors: parsed.error.errors });
    const asset = await storage.createAsset(parsed.data);
    broadcastToClients({ type: 'ASSET_CREATED', payload: asset });
    res.status(201).json(asset);
  }));

  app.get('/api/assets/:id', authorizeRoles('admin', 'supervisor', 'technician', 'operator') as any, asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    const asset = await storage.getAssetById(id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    res.json(asset);
  }));

  app.put('/api/assets/:id', authorizeRoles('admin', 'supervisor') as any, asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const asset = await storage.updateAsset(id, updates);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    // Invalidate asset cache
    await assetCacheService.clearAssetCaches(String(id));
    // Publish to Redis for real-time update
    if (req.app && req.app.locals && req.app.locals.redisPublisher) {
      req.app.locals.redisPublisher.publish('asset-events', JSON.stringify({ type: 'ASSET_UPDATED', payload: asset }));
    }
    broadcastToClients({ type: 'ASSET_UPDATED', payload: asset });
    res.json(asset);
  }));

  app.delete('/api/assets/:id', authorizeRoles('admin') as any, asyncHandler(async (req: AuthRequest, res, _next) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteAsset(id);
    if (!success) {
      return res.status(404).json({ message: "Asset not found" });
    }
    // Invalidate asset cache
    await assetCacheService.clearAssetCaches(String(id));
    // Publish to Redis for real-time delete
    if (req.app && req.app.locals && req.app.locals.redisPublisher) {
      req.app.locals.redisPublisher.publish('asset-events', JSON.stringify({ type: 'ASSET_DELETED', payload: { id } }));
    }
    // Broadcast asset deletion to all connected clients
    broadcastToClients({
      type: 'ASSET_DELETED',
      payload: { id }
    });
    res.status(204).send();
  }));

  /**
 * @openapi
 * /api/work-orders:
 *   get:
 *     summary: Get a list of work orders
 *     tags: [WorkOrders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by status
 *       - in: query
 *         name: assignedToUserId
 *         schema: { type: string }
 *         description: Filter by assigned user
 *       - in: query
 *         name: assetId
 *         schema: { type: integer }
 *         description: Filter by asset
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Limit number of results
 *       - in: query
 *         name: offset
 *         schema: { type: integer }
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of work orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkOrder'
 *   post:
 *     summary: Create a new work order
 *     tags: [WorkOrders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkOrderInput'
 *     responses:
 *       201:
 *         description: Work order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkOrder'
 *       400:
 *         description: Invalid work order data
 */
  app.get('/api/work-orders', authorizeRoles('admin', 'supervisor', 'technician') as any, asyncHandler(async (req: AuthRequest, res) => {
    const filters = {
      status: req.query.status as string,
      assignedToUserId: req.query.assignedToUserId as string,
      assetId: req.query.assetId ? parseInt(req.query.assetId as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };
    const workOrders = await storage.getWorkOrders(filters);
    res.json(workOrders);
  }));

  app.post('/api/work-orders', authorizeRoles('admin', 'supervisor') as any, asyncHandler(async (req: AuthRequest, res) => {
    const parsed = insertWorkOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid work order data', errors: parsed.error.errors });
    const workOrder = await storage.createWorkOrder(parsed.data);
    broadcastToClients({ type: 'WORK_ORDER_CREATED', payload: workOrder });
    res.status(201).json(workOrder);
  }));

  app.get('/api/work-orders/:id', authorizeRoles('admin', 'supervisor', 'technician') as any, asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    const workOrder = await storage.getWorkOrderById(id);
    if (!workOrder) return res.status(404).json({ message: 'Work order not found' });
    res.json(workOrder);
  }));

  app.put('/api/work-orders/:id', authorizeRoles('admin', 'supervisor') as any, asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const workOrder = await storage.updateWorkOrder(id, updates);
    if (!workOrder) return res.status(404).json({ message: 'Work order not found' });
    broadcastToClients({ type: 'WORK_ORDER_UPDATED', payload: workOrder });
    res.json(workOrder);
  }));

  app.delete('/api/work-orders/:id', authorizeRoles('admin') as any, asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    // Delete the work order from the database
    const deleted = await storage.deleteWorkOrder(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Work order not found' });
    }
    // Publish to Redis for real-time delete
    const { publishToChannel } = require('./services/websocketService').default;
    await publishToChannel('events:workorders', { type: 'WORK_ORDER_DELETED', payload: { id } });
    // Broadcast to websocket clients as well
    broadcastToClients({ type: 'WORK_ORDER_DELETED', payload: { id } });
    res.status(204).send();
  }));

  /**
 * @openapi
 * /api/maintenance-schedules:
 *   get:
 *     summary: Get a list of maintenance schedules
 *     tags: [MaintenanceSchedules]
 *     parameters:
 *       - in: query
 *         name: assetId
 *         schema: { type: integer }
 *         description: Filter by asset
 *       - in: query
 *         name: overdue
 *         schema: { type: boolean }
 *         description: Filter overdue schedules
 *     responses:
 *       200:
 *         description: List of maintenance schedules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MaintenanceSchedule'
 *   post:
 *     summary: Create a new maintenance schedule
 *     tags: [MaintenanceSchedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceScheduleInput'
 *     responses:
 *       201:
 *         description: Maintenance schedule created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaintenanceSchedule'
 *       400:
 *         description: Invalid schedule data
 */
  app.get('/api/maintenance-schedules', authorizeRoles('admin', 'supervisor', 'technician') as any, asyncHandler(async (req: AuthRequest, res) => {
    const filters = {
      assetId: req.query.assetId ? parseInt(req.query.assetId as string) : undefined,
      overdue: req.query.overdue === 'true',
    };
    const schedules = await storage.getMaintenanceSchedules(filters);
    res.json(schedules);
  }));

  app.post('/api/maintenance-schedules', authorizeRoles('admin', 'supervisor') as any, asyncHandler(async (req: AuthRequest, res) => {
    const parsed = insertMaintenanceScheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid schedule data', errors: parsed.error.errors });
    const schedule = await storage.createMaintenanceSchedule(parsed.data);
    broadcastToClients({ type: 'MAINTENANCE_SCHEDULE_CREATED', payload: schedule });
    res.status(201).json(schedule);
  }));

  /**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Get notifications for the current user
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean }
 *         description: Only unread notifications
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *   post:
 *     summary: Create a notification
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationInput'
 *     responses:
 *       201:
 *         description: Notification created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Invalid notification data
 */
  app.get('/api/notifications', authorizeRoles('admin', 'supervisor', 'technician', 'operator') as any, asyncHandler(async (req: AuthRequest, res) => {
    // Assume req.user.userId is set by JWT middleware
    const userId = req.user?.userId;
    const unreadOnly = req.query.unreadOnly === 'true';
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const notifications = await storage.getUserNotifications(userId, unreadOnly);
    res.json(notifications);
  }));

  app.post('/api/notifications', authorizeRoles('admin', 'supervisor') as any, asyncHandler(async (req: AuthRequest, res) => {
    const parsed = insertNotificationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid notification data', errors: parsed.error.errors });
    const notification = await storage.createNotification(parsed.data);
    broadcastToClients({ type: 'NOTIFICATION', payload: notification });
    res.status(201).json(notification);
  }));

  return server;
}

// Instantiate storage for use in all routes
const storage = new DatabaseStorage();
