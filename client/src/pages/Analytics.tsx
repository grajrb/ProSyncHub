import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { RootState } from '@/store';
import { setLoading, setTimeSeriesData, setActiveAssetId } from '@/store/slices/analyticsSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import GaugeChart from '@/components/charts/GaugeChart';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import BarChart from '@/components/charts/BarChart';
import { formatTimeSeriesData, formatComparisonData, SensorInfo } from '@/lib/chartUtils';

export default function AnalyticsDashboard() {
  const dispatch = useDispatch();
  const { 
    timeSeriesData, 
    activeSensorIds, 
    activeAssetId,
    dateRange,
    interval,
    loading 
  } = useSelector((state: RootState) => state.analytics);

  // Fetch assets
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['/api/assets'],
    queryFn: async () => {
      const res = await axios.get('/api/assets');
      return res.data;
    }
  });

  // Fetch sensors for the selected asset
  const { data: sensors, isLoading: sensorsLoading } = useQuery({
    queryKey: ['/api/sensors', { assetId: activeAssetId }],
    queryFn: async () => {
      if (!activeAssetId) return [];
      const res = await axios.get('/api/sensors', { params: { assetId: activeAssetId } });
      return res.data;
    },
    enabled: !!activeAssetId,
  });

  // Fetch recent sensor readings (latest for each sensor)
  const { data: recentReadings, isLoading: readingsLoading } = useQuery({
    queryKey: ['/api/sensors/recent', { assetId: activeAssetId, sensorIds: activeSensorIds }],
    queryFn: async () => {
      if (!activeAssetId || !activeSensorIds.length) return [];
      // Fetch latest for each sensor
      const results = await Promise.all(
        activeSensorIds.map(async (sensorId) => {
          const res = await axios.get('/api/sensors/latest', { params: { assetId: activeAssetId, sensorId } });
          return res.data;
        })
      );
      return results;
    },
    enabled: !!activeAssetId && activeSensorIds.length > 0,
  });

  // Fetch historical sensor data (time series analytics)
  const { data: historicalData, isLoading: historicalLoading } = useQuery({
    queryKey: [
      '/api/sensors/analytics',
      {
        assetId: activeAssetId,
        sensorTypes: sensors ? sensors.filter((s: any) => activeSensorIds.includes(s.id)).map((s: any) => s.sensorType) : [],
        startDate: dateRange.start,
        endDate: dateRange.end,
        interval
      }
    ],
    queryFn: async () => {
      if (!activeAssetId || !activeSensorIds.length || !sensors) return null;
      const sensorTypes = sensors.filter((s: any) => activeSensorIds.includes(s.id)).map((s: any) => s.sensorType);
      const res = await axios.get('/api/sensors/analytics', {
        params: {
          assetId: activeAssetId,
          sensorTypes,
          startDate: dateRange.start,
          endDate: dateRange.end,
          interval
        }
      });
      return res.data;
    },
    enabled: !!activeAssetId && activeSensorIds.length > 0 && !!sensors,
  });

  // Initialize the first asset as active if none is selected
  useEffect(() => {
    if (!activeAssetId && assets?.length > 0) {
      dispatch(setActiveAssetId(assets[0].id));
    }
  }, [assets, activeAssetId, dispatch]);

  // Set historical data in redux when it changes
  useEffect(() => {
    if (historicalData) {
      dispatch(setTimeSeriesData(historicalData));
    }
  }, [historicalData, dispatch]);

  // Set loading state
  useEffect(() => {
    dispatch(setLoading(
      assetsLoading || 
      sensorsLoading || 
      readingsLoading || 
      historicalLoading
    ));
  }, [assetsLoading, sensorsLoading, readingsLoading, historicalLoading, dispatch]);

  // Format time series data for charts
  const timeSeriesChartData = useMemo(() => {
    if (!sensors) return { datasets: [] };
    return formatTimeSeriesData(timeSeriesData, activeSensorIds, sensors as SensorInfo[]);
  }, [timeSeriesData, activeSensorIds, sensors]);

  // Format comparison data for bar chart
  const comparisonChartData = useMemo(() => {
    if (!sensors) return { labels: [], datasets: [] };
    return formatComparisonData(timeSeriesData, activeSensorIds, sensors as SensorInfo[]);
  }, [timeSeriesData, activeSensorIds, sensors]);

  // Select a different asset
  const handleAssetChange = (assetId: number) => {
    dispatch(setActiveAssetId(assetId));
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Analytics Dashboard</h1>
          <p className="text-neutral-500">Monitor and analyze sensor data from your assets</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button variant="outline" size="sm">
            <i className="fas fa-download mr-2"></i>
            Export
          </Button>
          <Button size="sm">
            <i className="fas fa-redo-alt mr-2"></i>
            Refresh
          </Button>
        </div>
      </div>

      {/* Asset Selection */}
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="font-inter font-semibold text-neutral-900">Select Asset</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center overflow-x-auto p-4 space-x-2">
            {assetsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-40 rounded-full" />
              ))
            ) : (
              assets?.map((asset: any) => (
                <Button
                  key={asset.id}
                  variant={activeAssetId === asset.id ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => handleAssetChange(asset.id)}
                >
                  {asset.name}
                </Button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {readingsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-lg" />
              ))
            ) : (
              recentReadings?.slice(0, 4).map((reading: any) => (
                <GaugeChart
                  key={reading.id}
                  title={reading.name}
                  value={reading.value}
                  min={reading.min}
                  max={reading.max}
                  unit={reading.unit}
                  thresholds={{ warning: reading.warningThreshold, critical: reading.criticalThreshold }}
                />
              ))
            )}
          </div>

          {/* Time Series Chart */}
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="font-inter font-semibold text-neutral-900">Sensor Readings Over Time</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <TimeSeriesChart 
                title="Historical Sensor Data"
                data={timeSeriesChartData} 
                loading={loading}
              />
            </CardContent>
          </Card>

          {/* Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Sensor Status</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Operational</span>
                    <Badge className="bg-status-success text-white">12</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Warning</span>
                    <Badge className="bg-status-warning text-white">3</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Critical</span>
                    <Badge className="bg-status-error text-white">1</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Offline</span>
                    <Badge className="bg-neutral-500 text-white">2</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Alerts</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-red-50 border border-red-200">
                    <i className="fas fa-exclamation-triangle text-status-error mt-1"></i>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Temperature Threshold Exceeded</p>
                      <p className="text-xs text-neutral-600">Boiler B-101 temperature above limit</p>
                      <p className="text-xs text-neutral-500 mt-1">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <i className="fas fa-exclamation-circle text-status-warning mt-1"></i>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Pressure Fluctuation</p>
                      <p className="text-xs text-neutral-600">Compressor C-501 pressure unstable</p>
                      <p className="text-xs text-neutral-500 mt-1">3 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Schedule Maintenance</p>
                      <p className="text-xs text-neutral-600">Boiler B-101 requires inspection</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <i className="fas fa-check-circle text-green-500 mt-1"></i>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Efficiency Opportunity</p>
                      <p className="text-xs text-neutral-600">Optimize cooling cycle for energy savings</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="font-inter font-semibold text-neutral-900">Long-Term Trends</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <TimeSeriesChart 
                title="Sensor Data Trends"
                data={timeSeriesChartData} 
                loading={loading}
                options={{
                  scales: {
                    x: {
                      time: {
                        unit: 'week'
                      }
                    }
                  }
                }}
              />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">Efficiency</span>
                      <span className="text-sm font-medium text-neutral-700">92%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full" style={{ width: '92%' }} aria-label="Efficiency 92%" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">Uptime</span>
                      <span className="text-sm font-medium text-neutral-700">98.5%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full" style={{ width: '98.5%' }} aria-label="Uptime 98.5%" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">Maintenance Compliance</span>
                      <span className="text-sm font-medium text-neutral-700">85%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full" style={{ width: '85%' }} aria-label="Maintenance Compliance 85%" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">Energy Usage</span>
                      <span className="text-sm font-medium text-neutral-700">78%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full" style={{ width: '78%' }} aria-label="Energy Usage 78%" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Anomaly Detection</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-status-error rounded-full"></div>
                        <p className="font-medium text-sm">Temperature Spike</p>
                      </div>
                      <Badge className="bg-neutral-100 text-neutral-700">May 30</Badge>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">
                      Sudden increase detected in boiler temperature reaching 15% above normal operating range.
                    </p>
                  </div>
                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-status-warning rounded-full"></div>
                        <p className="font-medium text-sm">Vibration Pattern</p>
                      </div>
                      <Badge className="bg-neutral-100 text-neutral-700">May 25</Badge>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">
                      Unusual vibration pattern detected in compressor unit during operation cycles.
                    </p>
                  </div>
                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-status-warning rounded-full"></div>
                        <p className="font-medium text-sm">Power Consumption</p>
                      </div>
                      <Badge className="bg-neutral-100 text-neutral-700">May 22</Badge>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">
                      Gradual increase in power consumption detected over the past week.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="font-inter font-semibold text-neutral-900">Sensor Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <BarChart 
                title="Average Sensor Values"
                data={comparisonChartData} 
                loading={loading}
              />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Highest Values</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {activeSensorIds.length > 0 ? (
                    activeSensorIds.slice(0, 5).map((id, index) => {
                      const sensor = sensors?.find((s: any) => s.id === id);
                      const series = timeSeriesData[id];
                      
                      if (!sensor || !series) return null;
                      
                      // Find max value
                      const maxValue = series.dataPoints.reduce(
                        (max, point) => Math.max(max, point.value), 
                        -Infinity
                      );
                      
                      return (
                        <div key={id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700">
                              {index + 1}
                            </div>
                            <span className="text-sm text-neutral-700">{sensor.name}</span>
                          </div>
                          <span className="text-sm font-medium">
                            {maxValue.toFixed(2)} {sensor.unit}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      No sensors selected
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Lowest Values</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {activeSensorIds.length > 0 ? (
                    activeSensorIds.slice(0, 5).map((id, index) => {
                      const sensor = sensors?.find((s: any) => s.id === id);
                      const series = timeSeriesData[id];
                      
                      if (!sensor || !series) return null;
                      
                      // Find min value
                      const minValue = series.dataPoints.reduce(
                        (min, point) => Math.min(min, point.value), 
                        Infinity
                      );
                      
                      return (
                        <div key={id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700">
                              {index + 1}
                            </div>
                            <span className="text-sm text-neutral-700">{sensor.name}</span>
                          </div>
                          <span className="text-sm font-medium">
                            {minValue.toFixed(2)} {sensor.unit}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      No sensors selected
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Most Variable</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {activeSensorIds.length > 0 ? (
                    activeSensorIds.slice(0, 5).map((id, index) => {
                      const sensor = sensors?.find((s: any) => s.id === id);
                      const series = timeSeriesData[id];
                      
                      if (!sensor || !series || series.dataPoints.length < 2) return null;
                      
                      // Calculate standard deviation as a measure of variability
                      const values = series.dataPoints.map(p => p.value);
                      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
                      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
                      const stdDev = Math.sqrt(variance);
                      
                      return (
                        <div key={id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700">
                              {index + 1}
                            </div>
                            <span className="text-sm text-neutral-700">{sensor.name}</span>
                          </div>
                          <span className="text-sm font-medium">
                            ±{stdDev.toFixed(2)} {sensor.unit}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      No sensors selected
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
