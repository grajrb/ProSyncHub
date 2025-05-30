import type { Express } from "express";
import { createServer, type Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertAssetSchema, insertWorkOrderSchema, insertMaintenanceScheduleSchema, insertNotificationSchema, insertAssetSensorReadingSchema } from "@shared/schema";
import { z } from "zod";

// WebSocket clients management
const wsClients = new Set<WebSocket>();

function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/metrics', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Asset routes
  app.get('/api/assets', isAuthenticated, async (req, res) => {
    try {
      const { locationId, status, limit = 50, offset = 0 } = req.query;
      const filters = {
        locationId: locationId ? parseInt(locationId as string) : undefined,
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };
      const assets = await storage.getAssets(filters);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get('/api/assets/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAssetById(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.post('/api/assets', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset(validatedData);
      
      // Broadcast asset creation to all connected clients
      broadcastToClients({
        type: 'ASSET_CREATED',
        payload: asset
      });
      
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid asset data", errors: error.errors });
      }
      console.error("Error creating asset:", error);
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  app.put('/api/assets/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertAssetSchema.partial().parse(req.body);
      const asset = await storage.updateAsset(id, updates);
      
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      // Broadcast asset update to all connected clients
      broadcastToClients({
        type: 'ASSET_UPDATED',
        payload: asset
      });
      
      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid asset data", errors: error.errors });
      }
      console.error("Error updating asset:", error);
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  app.delete('/api/assets/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAsset(id);
      
      if (!success) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      // Broadcast asset deletion to all connected clients
      broadcastToClients({
        type: 'ASSET_DELETED',
        payload: { id }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  app.get('/api/assets/:id/hierarchy', isAuthenticated, async (req, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const childAssets = await storage.getAssetHierarchy(parentId);
      res.json(childAssets);
    } catch (error) {
      console.error("Error fetching asset hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch asset hierarchy" });
    }
  });

  // Work order routes
  app.get('/api/work-orders', isAuthenticated, async (req, res) => {
    try {
      const { status, assignedToUserId, assetId, limit = 50, offset = 0 } = req.query;
      const filters = {
        status: status as string,
        assignedToUserId: assignedToUserId as string,
        assetId: assetId ? parseInt(assetId as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };
      const workOrders = await storage.getWorkOrders(filters);
      res.json(workOrders);
    } catch (error) {
      console.error("Error fetching work orders:", error);
      res.status(500).json({ message: "Failed to fetch work orders" });
    }
  });

  app.get('/api/work-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const workOrder = await storage.getWorkOrderById(id);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }
      res.json(workOrder);
    } catch (error) {
      console.error("Error fetching work order:", error);
      res.status(500).json({ message: "Failed to fetch work order" });
    }
  });

  app.post('/api/work-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workOrderData = { ...req.body, reportedByUserId: userId };
      const validatedData = insertWorkOrderSchema.parse(workOrderData);
      const workOrder = await storage.createWorkOrder(validatedData);
      
      // Create notification for assigned user if specified
      if (workOrder.assignedToUserId) {
        await storage.createNotification({
          userId: workOrder.assignedToUserId,
          title: "New Work Order Assigned",
          message: `You have been assigned work order: ${workOrder.title}`,
          type: "info",
          relatedEntityType: "work_order",
          relatedEntityId: workOrder.id,
        });
      }
      
      // Broadcast work order creation to all connected clients
      broadcastToClients({
        type: 'WORK_ORDER_CREATED',
        payload: workOrder
      });
      
      res.status(201).json(workOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid work order data", errors: error.errors });
      }
      console.error("Error creating work order:", error);
      res.status(500).json({ message: "Failed to create work order" });
    }
  });

  app.put('/api/work-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertWorkOrderSchema.partial().parse(req.body);
      const workOrder = await storage.updateWorkOrder(id, updates);
      
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }
      
      // Broadcast work order update to all connected clients
      broadcastToClients({
        type: 'WORK_ORDER_UPDATED',
        payload: workOrder
      });
      
      res.json(workOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid work order data", errors: error.errors });
      }
      console.error("Error updating work order:", error);
      res.status(500).json({ message: "Failed to update work order" });
    }
  });

  app.put('/api/work-orders/:id/assign', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const workOrder = await storage.assignWorkOrder(id, userId);
      
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }
      
      // Create notification for assigned user
      await storage.createNotification({
        userId: userId,
        title: "Work Order Assigned",
        message: `You have been assigned work order: ${workOrder.title}`,
        type: "info",
        relatedEntityType: "work_order",
        relatedEntityId: workOrder.id,
      });
      
      // Broadcast work order assignment to all connected clients
      broadcastToClients({
        type: 'WORK_ORDER_ASSIGNED',
        payload: workOrder
      });
      
      res.json(workOrder);
    } catch (error) {
      console.error("Error assigning work order:", error);
      res.status(500).json({ message: "Failed to assign work order" });
    }
  });

  // Maintenance schedule routes
  app.get('/api/maintenance-schedules', isAuthenticated, async (req, res) => {
    try {
      const { assetId, overdue } = req.query;
      const filters = {
        assetId: assetId ? parseInt(assetId as string) : undefined,
        overdue: overdue === 'true',
      };
      const schedules = await storage.getMaintenanceSchedules(filters);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching maintenance schedules:", error);
      res.status(500).json({ message: "Failed to fetch maintenance schedules" });
    }
  });

  app.post('/api/maintenance-schedules', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertMaintenanceScheduleSchema.parse(req.body);
      const schedule = await storage.createMaintenanceSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance schedule data", errors: error.errors });
      }
      console.error("Error creating maintenance schedule:", error);
      res.status(500).json({ message: "Failed to create maintenance schedule" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { unreadOnly } = req.query;
      const notifications = await storage.getUserNotifications(userId, unreadOnly === 'true');
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(id);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Sensor data routes
  app.post('/api/sensor-readings', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAssetSensorReadingSchema.parse(req.body);
      const reading = await storage.addSensorReading(validatedData);
      
      // Check for alert conditions and create notifications
      if (validatedData.sensorType === 'temperature' && parseFloat(validatedData.value) > 300) {
        // Create critical temperature alert
        await storage.createNotification({
          userId: req.user.claims.sub,
          title: "Critical Temperature Alert",
          message: `Asset ${validatedData.assetId} temperature exceeds safe limits: ${validatedData.value}${validatedData.unit}`,
          type: "error",
          relatedEntityType: "asset",
          relatedEntityId: validatedData.assetId,
        });
      }
      
      // Broadcast sensor reading to all connected clients
      broadcastToClients({
        type: 'SENSOR_READING',
        payload: reading
      });
      
      res.status(201).json(reading);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sensor reading data", errors: error.errors });
      }
      console.error("Error adding sensor reading:", error);
      res.status(500).json({ message: "Failed to add sensor reading" });
    }
  });

  app.get('/api/assets/:id/sensor-readings', isAuthenticated, async (req, res) => {
    try {
      const assetId = parseInt(req.params.id);
      const { sensorType } = req.query;
      const readings = await storage.getLatestSensorReadings(assetId, sensorType as string);
      res.json(readings);
    } catch (error) {
      console.error("Error fetching sensor readings:", error);
      res.status(500).json({ message: "Failed to fetch sensor readings" });
    }
  });

  // Reference data routes
  app.get('/api/roles', isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.get('/api/plants', isAuthenticated, async (req, res) => {
    try {
      const plants = await storage.getPlants();
      res.json(plants);
    } catch (error) {
      console.error("Error fetching plants:", error);
      res.status(500).json({ message: "Failed to fetch plants" });
    }
  });

  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const { plantId } = req.query;
      const locations = await storage.getLocations(plantId ? parseInt(plantId as string) : undefined);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get('/api/asset-types', isAuthenticated, async (req, res) => {
    try {
      const assetTypes = await storage.getAssetTypes();
      res.json(assetTypes);
    } catch (error) {
      console.error("Error fetching asset types:", error);
      res.status(500).json({ message: "Failed to fetch asset types" });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    wsClients.add(ws);
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      wsClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });
  });

  return httpServer;
}
