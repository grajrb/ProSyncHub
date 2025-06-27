'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw
} from 'lucide-react';

export default function AnalyticsPage() {
  const [isRealTime, setIsRealTime] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  console.log('Analytics page rendered in real-time mode:', isRealTime);

  // Simulated real-time data
  const [assetPerformanceData, setAssetPerformanceData] = useState([
    { time: '00:00', pump: 87, motor: 72, compressor: 45, hvac: 94 },
    { time: '04:00', pump: 89, motor: 70, compressor: 43, hvac: 95 },
    { time: '08:00', pump: 86, motor: 68, compressor: 47, hvac: 93 },
    { time: '12:00', pump: 88, motor: 73, compressor: 49, hvac: 96 },
    { time: '16:00', pump: 85, motor: 71, compressor: 44, hvac: 92 },
    { time: '20:00', pump: 87, motor: 69, compressor: 46, hvac: 94 },
  ]);

  const [maintenanceData] = useState([
    { month: 'Jan', preventive: 12, corrective: 8, emergency: 2 },
    { month: 'Feb', preventive: 15, corrective: 6, emergency: 1 },
    { month: 'Mar', preventive: 18, corrective: 10, emergency: 3 },
    { month: 'Apr', preventive: 14, corrective: 7, emergency: 1 },
    { month: 'May', preventive: 20, corrective: 5, emergency: 0 },
    { month: 'Jun', preventive: 16, corrective: 9, emergency: 2 },
  ]);

  const [uptimeData] = useState([
    { name: 'Pumps', value: 98.5, color: '#00D4AA' },
    { name: 'Motors', value: 94.2, color: '#0066CC' },
    { name: 'Compressors', value: 89.7, color: '#FF8C00' },
    { name: 'HVAC', value: 99.1, color: '#6C757D' },
  ]);

  const [alertsData] = useState([
    { time: '06:00', critical: 0, high: 1, medium: 3, low: 2 },
    { time: '12:00', critical: 1, high: 2, medium: 1, low: 4 },
    { time: '18:00', critical: 0, high: 3, medium: 2, low: 1 },
    { time: '24:00', critical: 0, high: 1, medium: 4, low: 3 },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isRealTime) return;

    const interval = setInterval(() => {
      setAssetPerformanceData(prev => {
        const newData = [...prev];
        // Update the last entry with slight variations
        const lastIndex = newData.length - 1;
        if (lastIndex >= 0) {
          newData[lastIndex] = {
            ...newData[lastIndex],
            pump: Math.max(80, Math.min(95, newData[lastIndex].pump + (Math.random() - 0.5) * 4)),
            motor: Math.max(65, Math.min(80, newData[lastIndex].motor + (Math.random() - 0.5) * 3)),
            compressor: Math.max(40, Math.min(55, newData[lastIndex].compressor + (Math.random() - 0.5) * 2)),
            hvac: Math.max(90, Math.min(98, newData[lastIndex].hvac + (Math.random() - 0.5) * 2)),
          };
        }
        return newData;
      });
      setLastUpdate(new Date());
    }, 3000);

    return () => clearInterval(interval);
  }, [isRealTime]);

  const totalAssets = 4;
  const healthyAssets = uptimeData.filter(item => item.value >= 95).length;
  const warningAssets = uptimeData.filter(item => item.value >= 90 && item.value < 95).length;
  const criticalAssets = uptimeData.filter(item => item.value < 90).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-industrial-gray-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-industrial-gray-400 mt-1">
            Performance insights and operational metrics
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`h-2 w-2 rounded-full ${isRealTime ? 'bg-industrial-teal animate-pulse-glow' : 'bg-industrial-gray-600'}`} />
            <span className="text-sm text-industrial-gray-300">
              {isRealTime ? 'Live Updates' : 'Static View'} • Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={isRealTime ? "default" : "outline"}
            size="sm"
            onClick={() => setIsRealTime(!isRealTime)}
            className={isRealTime ? "bg-industrial-teal hover:bg-industrial-teal/90 text-black" : "border-industrial-gray-600 text-white hover:bg-industrial-gray-800"}
          >
            <Activity className="h-4 w-4 mr-2" />
            {isRealTime ? 'Real-time ON' : 'Real-time OFF'}
          </Button>
          <Button variant="outline" size="sm" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-industrial-gray-400 uppercase tracking-wide">
                  Overall Equipment Effectiveness
                </p>
                <p className="text-3xl font-bold text-industrial-teal">94.2%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-industrial-teal" />
                  <span className="text-sm text-industrial-teal">+2.4%</span>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-industrial-teal" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-industrial-gray-400 uppercase tracking-wide">
                  Mean Time Between Failures
                </p>
                <p className="text-3xl font-bold text-white">486h</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-industrial-teal" />
                  <span className="text-sm text-industrial-teal">+12h</span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-industrial-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-industrial-gray-400 uppercase tracking-wide">
                  Mean Time To Repair
                </p>
                <p className="text-3xl font-bold text-white">2.4h</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="h-4 w-4 text-industrial-teal" />
                  <span className="text-sm text-industrial-teal">-0.3h</span>
                </div>
              </div>
              <Zap className="h-8 w-8 text-industrial-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-industrial-gray-400 uppercase tracking-wide">
                  Active Alerts
                </p>
                <p className="text-3xl font-bold text-industrial-amber">7</p>
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-4 w-4 text-industrial-amber" />
                  <span className="text-sm text-industrial-amber">2 High</span>
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-industrial-amber" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Performance Trends */}
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Asset Health Trends</CardTitle>
              {isRealTime && (
                <Badge className="bg-industrial-teal text-black">
                  <Activity className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={assetPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#343A40" />
                <XAxis dataKey="time" stroke="#ADB5BD" />
                <YAxis stroke="#ADB5BD" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #343A40',
                    borderRadius: '8px',
                    color: '#FFFFFF'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="pump" stroke="#00D4AA" strokeWidth={2} name="Primary Pump" />
                <Line type="monotone" dataKey="motor" stroke="#0066CC" strokeWidth={2} name="Motor Drive" />
                <Line type="monotone" dataKey="compressor" stroke="#FF8C00" strokeWidth={2} name="Air Compressor" />
                <Line type="monotone" dataKey="hvac" stroke="#6C757D" strokeWidth={2} name="HVAC Unit" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* System Uptime */}
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardHeader>
            <CardTitle className="text-white">System Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={uptimeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {uptimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #343A40',
                    borderRadius: '8px',
                    color: '#FFFFFF'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Maintenance Activities */}
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Maintenance Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={maintenanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#343A40" />
                <XAxis dataKey="month" stroke="#ADB5BD" />
                <YAxis stroke="#ADB5BD" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #343A40',
                    borderRadius: '8px',
                    color: '#FFFFFF'
                  }} 
                />
                <Legend />
                <Bar dataKey="preventive" stackId="a" fill="#00D4AA" name="Preventive" />
                <Bar dataKey="corrective" stackId="a" fill="#FF8C00" name="Corrective" />
                <Bar dataKey="emergency" stackId="a" fill="#FF4444" name="Emergency" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alert Distribution */}
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Alert Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={alertsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#343A40" />
                <XAxis dataKey="time" stroke="#ADB5BD" />
                <YAxis stroke="#ADB5BD" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #343A40',
                    borderRadius: '8px',
                    color: '#FFFFFF'
                  }} 
                />
                <Legend />
                <Area type="monotone" dataKey="critical" stackId="1" stroke="#FF4444" fill="#FF4444" name="Critical" />
                <Area type="monotone" dataKey="high" stackId="1" stroke="#FF8C00" fill="#FF8C00" name="High" />
                <Area type="monotone" dataKey="medium" stackId="1" stroke="#0066CC" fill="#0066CC" name="Medium" />
                <Area type="monotone" dataKey="low" stackId="1" stroke="#6C757D" fill="#6C757D" name="Low" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <Card className="bg-industrial-charcoal border-industrial-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Asset Health Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-industrial-teal/20 flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-industrial-teal">{healthyAssets}</span>
              </div>
              <p className="text-sm text-industrial-gray-400">Healthy Assets</p>
              <p className="text-xs text-industrial-teal">≥95% Health Score</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-industrial-amber/20 flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-industrial-amber">{warningAssets}</span>
              </div>
              <p className="text-sm text-industrial-gray-400">Warning Assets</p>
              <p className="text-xs text-industrial-amber">90-94% Health Score</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-industrial-red/20 flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-industrial-red">{criticalAssets}</span>
              </div>
              <p className="text-sm text-industrial-gray-400">Critical Assets</p>
              <p className="text-xs text-industrial-red">&lt;90% Health Score</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-industrial-blue/20 flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-industrial-blue">{totalAssets}</span>
              </div>
              <p className="text-sm text-industrial-gray-400">Total Assets</p>
              <p className="text-xs text-industrial-blue">Under Management</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}