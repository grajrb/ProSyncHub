'use client';

import React, { useState, useEffect } from 'react';
import StatCard from './components/dashboard/StatCard';
import AssetStatusCard from './components/dashboard/AssetStatusCard';
import { mockAssets, mockDashboardStats, mockSensorReadings } from './lib/mock-data';
import { 
  Package, 
  Zap, 
  AlertTriangle, 
  Wrench,
  TrendingUp,
  BarChart3,
  Clock
} from 'lucide-react';
import { useWebSocketContext } from './context/WebSocketContext';
import { useAssets, useAssetStatusSummary, useWorkOrderStatusSummary } from './lib/use-api';
import { toast } from 'sonner';

export default function Dashboard() {
  // Initially use mock data
  const [dashboardStats, setDashboardStats] = useState(mockDashboardStats);
  const [assets, setAssets] = useState(mockAssets);
  const [sensorReadings, setSensorReadings] = useState<Record<string, any>>({});
  
  // Get real-time updates via WebSocket
  const { isConnected, messages } = useWebSocketContext();
  
  // Fetch data from API
  // Define interfaces for asset data
  interface Asset {
    asset_id: string;
    asset_tag: string;
    current_status: string;
    health_score: number;
    // Other asset properties
  }

  // Response structure from the API
  interface AssetsResponse {
    assets: Asset[];
  }

  // Options for the useAssets hook
  interface UseAssetsOptions {
    onSuccess?: (data: AssetsResponse) => void;
    onError?: (error: Error) => void;
  }

    const { 
      data: assetsData, 
      error: assetsError, 
      isLoading: assetsLoading 
    } = useAssets({
      onSuccess: (data: AssetsResponse) => {
        if (data && data.assets) {
          // Replace mock data with real data when available
          setAssets(data.assets);
        }
      },
      onError: (error: Error) => {
        console.error('Failed to fetch assets:', error);
        toast.error('Failed to fetch assets data');
      }
    });
  
  const { 
    data: statusSummary, 
    error: statusError 
  } = useAssetStatusSummary({
    onSuccess: (data) => {
      if (data) {
        setDashboardStats(prevStats => ({
          ...prevStats,
          total_assets: data.total_assets || prevStats.total_assets,
          online_assets: data.online_assets || prevStats.online_assets,
          assets_with_errors: data.assets_with_errors || prevStats.assets_with_errors,
          avg_health_score: data.avg_health_score || prevStats.avg_health_score
        }));
      }
    }
  });
  
  // Define interface for work order summary data
  interface WorkOrderSummary {
    open_work_orders?: number;
    // Other potential work order summary properties
  }
  
  // Options for the useWorkOrderStatusSummary hook
  interface UseWorkOrderStatusSummaryOptions {
    onSuccess?: (data: WorkOrderSummary) => void;
    onError?: (error: Error) => void;
  }

  const { 
    data: workOrderSummary,
    error: workOrderError
  } = useWorkOrderStatusSummary({
    onSuccess: (data: WorkOrderSummary) => {
      if (data) {
        setDashboardStats(prevStats => ({
          ...prevStats,
          open_work_orders: data.open_work_orders || prevStats.open_work_orders
        }));
      }
    }
  });
  
  // Process WebSocket messages
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      
      switch (latestMessage.type) {
        case 'SENSOR_UPDATE':
          // Update sensor readings
          const { asset_id, sensor_type, value, unit } = latestMessage.data;
          setSensorReadings(prev => ({
            ...prev,
            [asset_id]: {
              ...(prev[asset_id] || {}),
              [sensor_type]: value,
              [`${sensor_type}_unit`]: unit
            }
          }));
          break;
        
        case 'ASSET_STATUS':
          // Update asset status
          const updatedAsset = latestMessage.data;
          setAssets(prev => 
            prev.map(asset => 
              asset.asset_id === updatedAsset.asset_id
                ? { ...asset, current_status: updatedAsset.current_status, health_score: updatedAsset.health_score }
                : asset
            )
          );
          break;
        
        case 'ALERT':
          // Show alert notification
          toast.warning(
            <div>
              <strong>{latestMessage.data.asset_tag}: {latestMessage.data.alert_type}</strong>
              <p>{latestMessage.data.message}</p>
            </div>
          );
          break;
          
        default:
          break;
      }
    }
  }, [messages]);

  function getSensorDataForAsset(asset_id: string): { temperature?: number; vibration?: number; pressure?: number; current?: number; } | undefined {
    // Get sensor data for the specific asset from our state
    const assetSensors = sensorReadings[asset_id];
    
    // If we don't have any sensor readings for this asset, return undefined
    if (!assetSensors) {
      return undefined;
    }
    
    // Return the sensor readings in the expected format
    return {
      temperature: assetSensors.temperature,
      vibration: assetSensors.vibration,
      pressure: assetSensors.pressure,
      current: assetSensors.current
    };
  }
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-industrial-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-white">Operations Dashboard</h1>
        <p className="text-industrial-gray-400 mt-1">
          Real-time overview of your industrial assets and operations
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-industrial-teal animate-pulse-glow' : 'bg-industrial-red'}`} />
          <span className="text-sm text-industrial-gray-300">
            {isConnected ? 'Connected: Real-time updates active' : 'Disconnected: Using cached data'}
            {' • '}Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Assets"
          value={mockDashboardStats.total_assets}
          icon={Package}
          status="default"
        />
        <StatCard
          title="Assets Online"
          value={mockDashboardStats.online_assets}
          icon={Zap}
          status="success"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Active Alerts"
          value={mockDashboardStats.assets_with_errors}
          icon={AlertTriangle}
          status="warning"
        />
        <StatCard
          title="Open Work Orders"
          value={mockDashboardStats.open_work_orders}
          icon={Wrench}
          status="default"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Average Health Score"
          value={`${mockDashboardStats.avg_health_score}%`}
          icon={TrendingUp}
          status="success"
          trend={{ value: 3.2, isPositive: true }}
        />
        <StatCard
          title="Maintenance Efficiency"
          value="94.2%"
          icon={BarChart3}
          status="success"
        />
        <StatCard
          title="Avg Response Time"
          value="2.4h"
          icon={Clock}
          status="default"
        />
      </div>

      {/* Asset Status Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Asset Status Overview</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-industrial-teal" />
              <span className="text-industrial-gray-400">Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-industrial-amber" />
              <span className="text-industrial-gray-400">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-industrial-red" />
              <span className="text-industrial-gray-400">Error</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-industrial-gray-600" />
              <span className="text-industrial-gray-400">Maintenance</span>
            </div>
          </div>
        </div>
        
        {assetsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <div key={index} className="h-40 bg-industrial-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assets.map((asset) => (
              <AssetStatusCard
                key={asset.asset_id}
                asset={asset}
                sensorData={getSensorDataForAsset(asset.asset_id)}
                onClick={() => {
                  console.log('Asset clicked:', asset.asset_tag);
                  // TODO: Navigate to asset detail page
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-industrial-charcoal rounded-lg border border-industrial-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-industrial-gray-800 rounded-lg">
            <div className="h-2 w-2 rounded-full bg-industrial-amber mt-2" />
            <div className="flex-1">
              <p className="text-sm text-white">
                <span className="font-medium">MOT-002</span> - High vibration detected
              </p>
              <p className="text-xs text-industrial-gray-400">
                Work order created automatically • 2 minutes ago
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-industrial-gray-800 rounded-lg">
            <div className="h-2 w-2 rounded-full bg-industrial-teal mt-2" />
            <div className="flex-1">
              <p className="text-sm text-white">
                <span className="font-medium">PMP-001</span> - Routine calibration completed
              </p>
              <p className="text-xs text-industrial-gray-400">
                All sensors within normal range • 1 hour ago
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-industrial-gray-800 rounded-lg">
            <div className="h-2 w-2 rounded-full bg-industrial-amber mt-2" />
            <div className="flex-1">
              <p className="text-sm text-white">
                <span className="font-medium">CMP-003</span> - Scheduled maintenance started
              </p>
              <p className="text-xs text-industrial-gray-400">
                Assigned to maintenance crew • 3 hours ago
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
