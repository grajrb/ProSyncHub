import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  date,
  decimal,
  pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  roleId: integer("role_id").references(() => roles.id).default(3), // Default to Technician
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Roles table
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
});

// Role permissions junction table
export const rolePermissions = pgTable("role_permissions", {
  roleId: integer("role_id").references(() => roles.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
}, (table) => ({
  pk: index("role_permissions_pk").on(table.roleId, table.permissionId)
}));

// Plants table
export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Locations table
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  plantId: integer("plant_id").references(() => plants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Asset types table
export const assetTypes = pgTable("asset_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
});

// Asset status enum
export const assetStatusEnum = pgEnum("asset_status", ["operational", "maintenance", "offline", "error"]);

// Assets table
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  assetTag: varchar("asset_tag", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  model: varchar("model", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  installationDate: date("installation_date"),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  assetTypeId: integer("asset_type_id").references(() => assetTypes.id).notNull(),
  parentAssetId: integer("parent_asset_id").references(() => assets.id),
  currentStatus: assetStatusEnum("current_status").default("operational"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work order status and type enums
export const workOrderStatusEnum = pgEnum("work_order_status", ["open", "in_progress", "completed", "cancelled"]);
export const workOrderTypeEnum = pgEnum("work_order_type", ["preventive", "corrective", "emergency"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "critical"]);

// Work orders table
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  assetId: integer("asset_id").references(() => assets.id).notNull(),
  status: workOrderStatusEnum("status").default("open"),
  priority: priorityEnum("priority").default("medium"),
  type: workOrderTypeEnum("type").default("corrective"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  reportedByUserId: varchar("reported_by_user_id").references(() => users.id).notNull(),
  scheduledDate: timestamp("scheduled_date"),
  completionDate: timestamp("completion_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Maintenance schedules table
export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").references(() => assets.id).notNull(),
  taskDescription: text("task_description").notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(), // 'daily', 'weekly', 'monthly', etc.
  nextDueDate: date("next_due_date").notNull(),
  lastPerformedDate: date("last_performed_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Asset sensor readings (for real-time monitoring)
export const assetSensorReadings = pgTable("asset_sensor_readings", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").references(() => assets.id).notNull(),
  sensorType: varchar("sensor_type", { length: 50 }).notNull(), // temperature, pressure, vibration, etc.
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("asset_sensor_readings_asset_id_idx").on(table.assetId),
  index("asset_sensor_readings_timestamp_idx").on(table.timestamp)
]);

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 20 }).default("info"), // info, warning, error, success
  isRead: boolean("is_read").default(false),
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // asset, work_order, etc.
  relatedEntityId: integer("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  assignedWorkOrders: many(workOrders, { relationName: "assignedTo" }),
  reportedWorkOrders: many(workOrders, { relationName: "reportedBy" }),
  notifications: many(notifications),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  permissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const plantsRelations = relations(plants, ({ many }) => ({
  locations: many(locations),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  plant: one(plants, {
    fields: [locations.plantId],
    references: [plants.id],
  }),
  assets: many(assets),
}));

export const assetTypesRelations = relations(assetTypes, ({ many }) => ({
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  location: one(locations, {
    fields: [assets.locationId],
    references: [locations.id],
  }),
  assetType: one(assetTypes, {
    fields: [assets.assetTypeId],
    references: [assetTypes.id],
  }),
  parentAsset: one(assets, {
    fields: [assets.parentAssetId],
    references: [assets.id],
    relationName: "parentChild",
  }),
  childAssets: many(assets, { relationName: "parentChild" }),
  workOrders: many(workOrders),
  maintenanceSchedules: many(maintenanceSchedules),
  sensorReadings: many(assetSensorReadings),
}));

export const workOrdersRelations = relations(workOrders, ({ one }) => ({
  asset: one(assets, {
    fields: [workOrders.assetId],
    references: [assets.id],
  }),
  assignedTo: one(users, {
    fields: [workOrders.assignedToUserId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  reportedBy: one(users, {
    fields: [workOrders.reportedByUserId],
    references: [users.id],
    relationName: "reportedBy",
  }),
}));

export const maintenanceSchedulesRelations = relations(maintenanceSchedules, ({ one }) => ({
  asset: one(assets, {
    fields: [maintenanceSchedules.assetId],
    references: [assets.id],
  }),
}));

export const assetSensorReadingsRelations = relations(assetSensorReadings, ({ one }) => ({
  asset: one(assets, {
    fields: [assetSensorReadings.assetId],
    references: [assets.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertAssetSensorReadingSchema = createInsertSchema(assetSensorReadings).omit({
  id: true,
  timestamp: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type AssetSensorReading = typeof assetSensorReadings.$inferSelect;
export type InsertAssetSensorReading = z.infer<typeof insertAssetSensorReadingSchema>;
export type Role = typeof roles.$inferSelect;
export type Plant = typeof plants.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type AssetType = typeof assetTypes.$inferSelect;
