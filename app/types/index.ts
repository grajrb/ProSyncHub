// Core Types for ProSync Hub

export interface User {
  user_id: string;
  username: string;
  email: string;
  role_id: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Role {
  role_id: string;
  role_name: string;
  permissions: Permission[];
}

export interface Permission {
  permission_id: string;
  permission_name: string;
}

export interface Asset {
  asset_id: string;
  asset_tag: string;
  name: string;
  description: string;
  model: string;
  manufacturer: string;
  serial_number: string;
  installation_date: string;
  location_id: string;
  location: Location;
  asset_type_id: string;
  asset_type: AssetType;
  parent_asset_id?: string;
  documentation_url?: string;
  qr_code_path?: string;
  current_status: AssetStatus;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface AssetType {
  asset_type_id: string;
  type_name: string;
  description: string;
}

export interface Location {
  location_id: string;
  location_name: string;
  description: string;
  plant_id: string;
  plant: Plant;
}

export interface Plant {
  plant_id: string;
  plant_name: string;
  address: string;
}

export interface WorkOrder {
  work_order_id: string;
  asset_id: string;
  asset: Asset;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  type: WorkOrderType;
  assigned_to_user_id?: string;
  assigned_to: User;
  reported_by_user_id: string;
  reported_by: User;
  scheduled_date?: string;
  completion_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SensorReading {
  asset_id: string;
  timestamp: string;
  sensor_type: string;
  value: number;
  unit: string;
  raw_data?: any;
}

export interface AssetEvent {
  asset_id: string;
  timestamp: string;
  event_type: 'ERROR' | 'WARNING' | 'INFO' | 'MAINTENANCE';
  message: string;
  details?: any;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  created_at: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

// Enums
export type AssetStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR' | 'WARNING';
export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WorkOrderType = 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY';

// Dashboard Types
export interface DashboardStats {
  total_assets: number;
  online_assets: number;
  offline_assets: number;
  assets_in_maintenance: number;
  assets_with_errors: number;
  open_work_orders: number;
  critical_work_orders: number;
  avg_health_score: number;
}

export interface AssetHealthTrend {
  asset_id: string;
  asset_name: string;
  current_health: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  prediction: 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL';
}