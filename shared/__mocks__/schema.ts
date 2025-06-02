// Mock for @shared/schema
import { z } from 'zod';

export const insertAssetSchema = z.object({
  name: z.string(),
  type: z.string(),
  location: z.string().optional(),
  status: z.string().optional(),
});

export const insertWorkOrderSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  status: z.string().optional(),
});

export const insertMaintenanceScheduleSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  frequency: z.string().optional(),
});

export const insertNotificationSchema = z.object({
  title: z.string(),
  message: z.string(),
  type: z.string().optional(),
});

export const insertAssetSensorReadingSchema = z.object({
  assetId: z.number(),
  sensorType: z.string(),
  value: z.number(),
});

// Add more mock schemas as needed
