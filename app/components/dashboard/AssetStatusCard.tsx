'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Asset } from '@/app/types';
import { 
  Package, 
  Zap, 
  AlertTriangle, 
  Wrench, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface AssetStatusCardProps {
  asset: Asset;
  sensorData?: {
    temperature?: number;
    vibration?: number;
    pressure?: number;
    current?: number;
  };
  onClick?: () => void;
}

export default function AssetStatusCard({ asset, sensorData, onClick }: AssetStatusCardProps) {
  console.log('AssetStatusCard rendered for asset:', asset.asset_tag);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return {
          color: 'success',
          icon: Zap,
          label: 'Online',
          bgClass: 'bg-industrial-teal/10 border-industrial-teal/30'
        };
      case 'WARNING':
        return {
          color: 'warning',
          icon: AlertTriangle,
          label: 'Warning',
          bgClass: 'bg-industrial-amber/10 border-industrial-amber/30'
        };
      case 'ERROR':
        return {
          color: 'error',
          icon: XCircle,
          label: 'Error',
          bgClass: 'bg-industrial-red/10 border-industrial-red/30'
        };
      case 'MAINTENANCE':
        return {
          color: 'warning',
          icon: Wrench,
          label: 'Maintenance',
          bgClass: 'bg-industrial-amber/10 border-industrial-amber/30'
        };
      case 'OFFLINE':
        return {
          color: 'error',
          icon: XCircle,
          label: 'Offline',
          bgClass: 'bg-industrial-gray-700/50 border-industrial-gray-600'
        };
      default:
        return {
          color: 'default',
          icon: Package,
          label: 'Unknown',
          bgClass: 'bg-industrial-gray-800 border-industrial-gray-700'
        };
    }
  };

  const getHealthTrend = (score: number) => {
    if (score >= 80) return { icon: TrendingUp, color: 'text-industrial-teal', label: 'Good' };
    if (score >= 60) return { icon: Minus, color: 'text-industrial-amber', label: 'Fair' };
    return { icon: TrendingDown, color: 'text-industrial-red', label: 'Poor' };
  };

  const statusConfig = getStatusConfig(asset.current_status);
  const healthTrend = getHealthTrend(asset.health_score);
  const StatusIcon = statusConfig.icon;
  const TrendIcon = healthTrend.icon;

  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-lg cursor-pointer border',
        statusConfig.bgClass
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-white">
              {asset.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono bg-industrial-gray-800 text-industrial-gray-300 border-industrial-gray-600">
                {asset.asset_tag}
              </Badge>
              <Badge className={cn(
                'text-xs',
                statusConfig.color === 'success' && 'bg-industrial-teal text-black',
                statusConfig.color === 'warning' && 'bg-industrial-amber text-black',
                statusConfig.color === 'error' && 'bg-industrial-red text-white',
                statusConfig.color === 'default' && 'bg-industrial-gray-700 text-white'
              )}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <TrendIcon className={cn('w-4 h-4', healthTrend.color)} />
              <span className={cn('text-sm font-medium', healthTrend.color)}>
                {asset.health_score}%
              </span>
            </div>
            <p className="text-xs text-industrial-gray-400">Health Score</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Asset Details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-industrial-gray-400">Type</p>
              <p className="text-white font-medium">{asset.asset_type.type_name}</p>
            </div>
            <div>
              <p className="text-industrial-gray-400">Location</p>
              <p className="text-white font-medium">{asset.location.location_name}</p>
            </div>
          </div>

          {/* Live Sensor Data (if available) */}
          {sensorData && (
            <div className="border-t border-industrial-gray-700 pt-3">
              <p className="text-xs font-medium text-industrial-gray-400 mb-2 uppercase tracking-wide">
                Live Sensors
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {sensorData.temperature && (
                  <div className="flex justify-between">
                    <span className="text-industrial-gray-400">Temp</span>
                    <span className={cn(
                      'font-mono',
                      sensorData.temperature > 75 ? 'text-industrial-red' : 'text-white'
                    )}>
                      {sensorData.temperature}°C
                    </span>
                  </div>
                )}
                {sensorData.vibration && (
                  <div className="flex justify-between">
                    <span className="text-industrial-gray-400">Vibration</span>
                    <span className={cn(
                      'font-mono',
                      sensorData.vibration > 4 ? 'text-industrial-amber' : 'text-white'
                    )}>
                      {sensorData.vibration}mm/s
                    </span>
                  </div>
                )}
                {sensorData.pressure && (
                  <div className="flex justify-between">
                    <span className="text-industrial-gray-400">Pressure</span>
                    <span className="text-white font-mono">{sensorData.pressure}bar</span>
                  </div>
                )}
                {sensorData.current && (
                  <div className="flex justify-between">
                    <span className="text-industrial-gray-400">Current</span>
                    <span className="text-white font-mono">{sensorData.current}A</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Indicator Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-industrial-gray-700 rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full transition-all duration-500 rounded-full',
                  asset.health_score >= 80 && 'bg-industrial-teal',
                  asset.health_score >= 60 && asset.health_score < 80 && 'bg-industrial-amber',
                  asset.health_score < 60 && 'bg-industrial-red'
                )}
                style={{ width: `${asset.health_score}%` }}
              />
            </div>
            {asset.current_status === 'ONLINE' && (
              <div className="h-2 w-2 rounded-full bg-industrial-teal animate-pulse-glow" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}