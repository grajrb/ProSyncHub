// Mock Data for ProSync Hub Development
import { Asset, WorkOrder, SensorReading, DashboardStats, AssetHealthTrend, AssetEvent, Notification } from '../types';

export const mockAssets: Asset[] = [
  {
    asset_id: '1',
    asset_tag: 'PMP-001',
    name: 'Primary Centrifugal Pump',
    description: 'Main water circulation pump for cooling system',
    model: 'KSB Etanorm G 065-040-315',
    manufacturer: 'KSB',
    serial_number: 'KSB-2023-001',
    installation_date: '2023-01-15',
    location_id: '1',
    location: {
      location_id: '1',
      location_name: 'Pump Station A',
      description: 'Primary pumping facility',
      plant_id: '1',
      plant: {
        plant_id: '1',
        plant_name: 'Manufacturing Plant Alpha',
        address: '1234 Industrial Way, Detroit, MI'
      }
    },
    asset_type_id: '1',
    asset_type: {
      asset_type_id: '1',
      type_name: 'Centrifugal Pump',
      description: 'High-pressure water circulation pump'
    },
    current_status: 'ONLINE',
    health_score: 87,
    created_at: '2023-01-10T10:00:00Z',
    updated_at: '2024-12-22T14:30:00Z'
  },
  {
    asset_id: '2',
    asset_tag: 'MOT-002',
    name: 'Conveyor Motor Drive',
    description: 'Main conveyor belt drive motor',
    model: 'Siemens 1LA7 096-6AA10',
    manufacturer: 'Siemens',
    serial_number: 'SIE-2023-045',
    installation_date: '2023-03-20',
    location_id: '2',
    location: {
      location_id: '2',
      location_name: 'Production Line 1',
      description: 'Main assembly line',
      plant_id: '1',
      plant: {
        plant_id: '1',
        plant_name: 'Manufacturing Plant Alpha',
        address: '1234 Industrial Way, Detroit, MI'
      }
    },
    asset_type_id: '2',
    asset_type: {
      asset_type_id: '2',
      type_name: 'Electric Motor',
      description: 'Three-phase induction motor'
    },
    current_status: 'WARNING',
    health_score: 72,
    created_at: '2023-03-15T08:00:00Z',
    updated_at: '2024-12-22T14:30:00Z'
  },
  {
    asset_id: '3',
    asset_tag: 'CMP-003',
    name: 'Air Compressor Unit',
    description: 'Pneumatic system air compressor',
    model: 'Atlas Copco GA 37',
    manufacturer: 'Atlas Copco',
    serial_number: 'AC-2022-156',
    installation_date: '2022-11-10',
    location_id: '3',
    location: {
      location_id: '3',
      location_name: 'Utility Room',
      description: 'Central utilities area',
      plant_id: '1',
      plant: {
        plant_id: '1',
        plant_name: 'Manufacturing Plant Alpha',
        address: '1234 Industrial Way, Detroit, MI'
      }
    },
    asset_type_id: '3',
    asset_type: {
      asset_type_id: '3',
      type_name: 'Compressor',
      description: 'Rotary screw air compressor'
    },
    current_status: 'MAINTENANCE',
    health_score: 45,
    created_at: '2022-11-05T12:00:00Z',
    updated_at: '2024-12-22T14:30:00Z'
  },
  {
    asset_id: '4',
    asset_tag: 'HVA-004',
    name: 'HVAC Unit North',
    description: 'Climate control system for north wing',
    model: 'Carrier 50HJQ024',
    manufacturer: 'Carrier',
    serial_number: 'CAR-2023-089',
    installation_date: '2023-05-12',
    location_id: '4',
    location: {
      location_id: '4',
      location_name: 'North Wing',
      description: 'North building section',
      plant_id: '1',
      plant: {
        plant_id: '1',
        plant_name: 'Manufacturing Plant Alpha',
        address: '1234 Industrial Way, Detroit, MI'
      }
    },
    asset_type_id: '4',
    asset_type: {
      asset_type_id: '4',
      type_name: 'HVAC System',
      description: 'Heating, ventilation, and air conditioning'
    },
    current_status: 'ONLINE',
    health_score: 94,
    created_at: '2023-05-08T09:00:00Z',
    updated_at: '2024-12-22T14:30:00Z'
  }
];

export const mockWorkOrders: WorkOrder[] = [
  {
    work_order_id: '1',
    asset_id: '2',
    asset: mockAssets[1],
    title: 'Motor Bearing Inspection',
    description: 'Inspect and lubricate motor bearings due to vibration alerts',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    type: 'CORRECTIVE',
    assigned_to_user_id: 'user-2',
    assigned_to: {
      user_id: 'user-2',
      username: 'john.tech',
      email: 'john.tech@prosync.com',
      role_id: 'role-2',
      role: {
        role_id: 'role-2',
        role_name: 'Technician',
        permissions: []
      },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2024-12-22T14:30:00Z'
    },
    reported_by_user_id: 'user-1',
    reported_by: {
      user_id: 'user-1',
      username: 'supervisor',
      email: 'supervisor@prosync.com',
      role_id: 'role-1',
      role: {
        role_id: 'role-1',
        role_name: 'Supervisor',
        permissions: []
      },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2024-12-22T14:30:00Z'
    },
    scheduled_date: '2024-12-23T10:00:00Z',
    created_at: '2024-12-22T08:00:00Z',
    updated_at: '2024-12-22T14:30:00Z'
  },
  {
    work_order_id: '2',
    asset_id: '3',
    asset: mockAssets[2],
    title: 'Quarterly Compressor Maintenance',
    description: 'Scheduled quarterly maintenance including filter replacement and oil change',
    status: 'OPEN',
    priority: 'MEDIUM',
    type: 'PREVENTIVE',
    assigned_to_user_id: 'user-3',
    assigned_to: {
      user_id: 'user-3',
      username: 'maintenance.crew',
      email: 'maintenance@prosync.com',
      role_id: 'role-2',
      role: {
        role_id: 'role-2',
        role_name: 'Technician',
        permissions: []
      },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2024-12-22T14:30:00Z'
    },
    reported_by_user_id: 'user-1',
    reported_by: {
      user_id: 'user-1',
      username: 'supervisor',
      email: 'supervisor@prosync.com',
      role_id: 'role-1',
      role: {
        role_id: 'role-1',
        role_name: 'Supervisor',
        permissions: []
      },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2024-12-22T14:30:00Z'
    },
    scheduled_date: '2024-12-25T14:00:00Z',
    created_at: '2024-12-20T12:00:00Z',
    updated_at: '2024-12-22T14:30:00Z'
  }
];

export const mockDashboardStats: DashboardStats = {
  total_assets: 4,
  online_assets: 2,
  offline_assets: 0,
  assets_in_maintenance: 1,
  assets_with_errors: 1,
  open_work_orders: 2,
  critical_work_orders: 0,
  avg_health_score: 74.5
};

export const mockSensorReadings: SensorReading[] = [
  // Recent readings for Primary Pump
  { asset_id: '1', timestamp: '2024-12-22T14:30:00Z', sensor_type: 'temperature', value: 68.5, unit: '°C' },
  { asset_id: '1', timestamp: '2024-12-22T14:30:00Z', sensor_type: 'vibration', value: 2.1, unit: 'mm/s' },
  { asset_id: '1', timestamp: '2024-12-22T14:30:00Z', sensor_type: 'pressure', value: 8.2, unit: 'bar' },
  
  // Recent readings for Motor
  { asset_id: '2', timestamp: '2024-12-22T14:30:00Z', sensor_type: 'temperature', value: 78.3, unit: '°C' },
  { asset_id: '2', timestamp: '2024-12-22T14:30:00Z', sensor_type: 'vibration', value: 4.7, unit: 'mm/s' },
  { asset_id: '2', timestamp: '2024-12-22T14:30:00Z', sensor_type: 'current', value: 15.8, unit: 'A' },
];

export const mockAssetEvents: AssetEvent[] = [
  {
    asset_id: '2',
    timestamp: '2024-12-22T13:45:00Z',
    event_type: 'WARNING',
    message: 'High vibration detected - exceeds normal operating range',
    details: { threshold: 3.0, current_value: 4.7 }
  },
  {
    asset_id: '1',
    timestamp: '2024-12-22T12:30:00Z',
    event_type: 'INFO',
    message: 'Routine sensor calibration completed',
    details: { calibrated_sensors: ['temperature', 'pressure'] }
  },
  {
    asset_id: '3',
    timestamp: '2024-12-22T10:15:00Z',
    event_type: 'MAINTENANCE',
    message: 'Asset placed in maintenance mode',
    details: { work_order_id: '2' }
  }
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    user_id: 'user-1',
    title: 'High Vibration Alert',
    message: 'Motor MOT-002 showing abnormal vibration levels',
    type: 'warning',
    read: false,
    created_at: '2024-12-22T13:45:00Z',
    related_entity_type: 'asset',
    related_entity_id: '2'
  },
  {
    id: '2',
    user_id: 'user-1',
    title: 'Work Order Assigned',
    message: 'New work order assigned to John Tech for Motor Bearing Inspection',
    type: 'info',
    read: false,
    created_at: '2024-12-22T08:00:00Z',
    related_entity_type: 'work_order',
    related_entity_id: '1'
  }
];