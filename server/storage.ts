import {
  users,
  assets,
  workOrders,
  maintenanceSchedules,
  notifications,
  assetSensorReadings,
  roles,
  plants,
  locations,
  assetTypes,
  rolePermissions,
  permissions,
  type User,
  type UpsertUser,
  type Asset,
  type InsertAsset,
  type WorkOrder,
  type InsertWorkOrder,
  type MaintenanceSchedule,
  type InsertMaintenanceSchedule,
  type Notification,
  type InsertNotification,
  type AssetSensorReading,
  type InsertAssetSensorReading,
  type Role,
  type Plant,
  type Location,
  type AssetType
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Asset operations
  createAsset(asset: InsertAsset): Promise<Asset>;
  getAssets(filters?: { locationId?: number; status?: string; limit?: number; offset?: number }): Promise<Asset[]>;
  getAssetById(id: number): Promise<Asset | undefined>;
  updateAsset(id: number, updates: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<boolean>;
  getAssetHierarchy(parentId?: number): Promise<Asset[]>;
  
  // Work order operations
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  getWorkOrders(filters?: { status?: string; assignedToUserId?: string; assetId?: number; limit?: number; offset?: number }): Promise<WorkOrder[]>;
  getWorkOrderById(id: number): Promise<WorkOrder | undefined>;
  updateWorkOrder(id: number, updates: Partial<InsertWorkOrder>): Promise<WorkOrder | undefined>;
  assignWorkOrder(id: number, userId: string): Promise<WorkOrder | undefined>;
  
  // Maintenance operations
  createMaintenanceSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule>;
  getMaintenanceSchedules(filters?: { assetId?: number; overdue?: boolean }): Promise<MaintenanceSchedule[]>;
  updateMaintenanceSchedule(id: number, updates: Partial<InsertMaintenanceSchedule>): Promise<MaintenanceSchedule | undefined>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<boolean>;
  
  // Sensor data operations
  addSensorReading(reading: InsertAssetSensorReading): Promise<AssetSensorReading>;
  getLatestSensorReadings(assetId: number, sensorType?: string): Promise<AssetSensorReading[]>;
  
  // Reference data operations
  getRoles(): Promise<Role[]>;
  getPlants(): Promise<Plant[]>;
  getLocations(plantId?: number): Promise<Location[]>;
  getAssetTypes(): Promise<AssetType[]>;
  
  // Dashboard operations
  getDashboardMetrics(): Promise<{
    totalAssets: number;
    operationalAssets: number;
    activeWorkOrders: number;
    activeAlerts: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Asset operations
  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async getAssets(filters?: { locationId?: number; status?: string; limit?: number; offset?: number }): Promise<Asset[]> {
    let query = db.select().from(assets);
    
    if (filters?.locationId) {
      query = query.where(eq(assets.locationId, filters.locationId));
    }
    
    if (filters?.status) {
      query = query.where(eq(assets.currentStatus, filters.status as any));
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query.orderBy(desc(assets.createdAt));
  }

  async getAssetById(id: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }

  async updateAsset(id: number, updates: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [asset] = await db
      .update(assets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return asset;
  }

  async deleteAsset(id: number): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id));
    return result.rowCount > 0;
  }

  async getAssetHierarchy(parentId?: number): Promise<Asset[]> {
    if (parentId) {
      return await db.select().from(assets).where(eq(assets.parentAssetId, parentId));
    }
    return await db.select().from(assets).where(sql`${assets.parentAssetId} IS NULL`);
  }

  // Work order operations
  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    const [newWorkOrder] = await db.insert(workOrders).values(workOrder).returning();
    return newWorkOrder;
  }

  async getWorkOrders(filters?: { status?: string; assignedToUserId?: string; assetId?: number; limit?: number; offset?: number }): Promise<WorkOrder[]> {
    let query = db.select().from(workOrders);
    
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(workOrders.status, filters.status as any));
    }
    
    if (filters?.assignedToUserId) {
      conditions.push(eq(workOrders.assignedToUserId, filters.assignedToUserId));
    }
    
    if (filters?.assetId) {
      conditions.push(eq(workOrders.assetId, filters.assetId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query.orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrderById(id: number): Promise<WorkOrder | undefined> {
    const [workOrder] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return workOrder;
  }

  async updateWorkOrder(id: number, updates: Partial<InsertWorkOrder>): Promise<WorkOrder | undefined> {
    const [workOrder] = await db
      .update(workOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workOrders.id, id))
      .returning();
    return workOrder;
  }

  async assignWorkOrder(id: number, userId: string): Promise<WorkOrder | undefined> {
    const [workOrder] = await db
      .update(workOrders)
      .set({ assignedToUserId: userId, updatedAt: new Date() })
      .where(eq(workOrders.id, id))
      .returning();
    return workOrder;
  }

  // Maintenance operations
  async createMaintenanceSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule> {
    const [newSchedule] = await db.insert(maintenanceSchedules).values(schedule).returning();
    return newSchedule;
  }

  async getMaintenanceSchedules(filters?: { assetId?: number; overdue?: boolean }): Promise<MaintenanceSchedule[]> {
    let query = db.select().from(maintenanceSchedules);
    
    const conditions = [eq(maintenanceSchedules.isActive, true)];
    
    if (filters?.assetId) {
      conditions.push(eq(maintenanceSchedules.assetId, filters.assetId));
    }
    
    if (filters?.overdue) {
      conditions.push(sql`${maintenanceSchedules.nextDueDate} < CURRENT_DATE`);
    }
    
    query = query.where(and(...conditions));
    
    return await query.orderBy(maintenanceSchedules.nextDueDate);
  }

  async updateMaintenanceSchedule(id: number, updates: Partial<InsertMaintenanceSchedule>): Promise<MaintenanceSchedule | undefined> {
    const [schedule] = await db
      .update(maintenanceSchedules)
      .set(updates)
      .where(eq(maintenanceSchedules.id, id))
      .returning();
    return schedule;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    let query = db.select().from(notifications).where(eq(notifications.userId, userId));
    
    if (unreadOnly) {
      query = query.where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    }
    
    return await query.orderBy(desc(notifications.createdAt)).limit(50);
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return result.rowCount > 0;
  }

  // Sensor data operations
  async addSensorReading(reading: InsertAssetSensorReading): Promise<AssetSensorReading> {
    const [newReading] = await db.insert(assetSensorReadings).values(reading).returning();
    return newReading;
  }

  async getLatestSensorReadings(assetId: number, sensorType?: string): Promise<AssetSensorReading[]> {
    let query = db.select().from(assetSensorReadings).where(eq(assetSensorReadings.assetId, assetId));
    
    if (sensorType) {
      query = query.where(and(
        eq(assetSensorReadings.assetId, assetId),
        eq(assetSensorReadings.sensorType, sensorType)
      ));
    }
    
    return await query.orderBy(desc(assetSensorReadings.timestamp)).limit(10);
  }

  // Reference data operations
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles);
  }

  async getPlants(): Promise<Plant[]> {
    return await db.select().from(plants);
  }

  async getLocations(plantId?: number): Promise<Location[]> {
    let query = db.select().from(locations);
    
    if (plantId) {
      query = query.where(eq(locations.plantId, plantId));
    }
    
    return await query;
  }

  async getAssetTypes(): Promise<AssetType[]> {
    return await db.select().from(assetTypes);
  }

  // Dashboard operations
  async getDashboardMetrics(): Promise<{
    totalAssets: number;
    operationalAssets: number;
    activeWorkOrders: number;
    activeAlerts: number;
  }> {
    const [totalAssetsResult] = await db.select({ count: count() }).from(assets);
    const [operationalAssetsResult] = await db
      .select({ count: count() })
      .from(assets)
      .where(eq(assets.currentStatus, "operational"));
    const [activeWorkOrdersResult] = await db
      .select({ count: count() })
      .from(workOrders)
      .where(or(eq(workOrders.status, "open"), eq(workOrders.status, "in_progress")));
    const [activeAlertsResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.isRead, false), or(eq(notifications.type, "warning"), eq(notifications.type, "error"))));

    return {
      totalAssets: totalAssetsResult.count,
      operationalAssets: operationalAssetsResult.count,
      activeWorkOrders: activeWorkOrdersResult.count,
      activeAlerts: activeAlertsResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
