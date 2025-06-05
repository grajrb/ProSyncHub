import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { RootState } from '@/store';
import { 
  setTimeSeriesData,
  setActiveAssetId,
  setLoading,
  setError,
} from '@/store/slices/analyticsSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import SensorSelector from '@/components/analytics/SensorSelector';
import DateRangeSelector from '@/components/analytics/DateRangeSelector';
import { formatTimeSeriesData, SensorInfo, aggregateTimeSeriesData } from '@/lib/chartUtils';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataStateDisplay';
import RoleBasedAccess from '@/components/RoleBasedAccess';

export default function SensorData() {
  const dispatch = useDispatch();
  const { 
    timeSeriesData, 
    activeSensorIds, 
    activeAssetId,
    dateRange,
    interval,
    loading,
    error
  } = useSelector((state: RootState) => state.analytics);
  // Fetch assets
  const { 
    data: assetsRaw, 
    isLoading: assetsLoading, 
    error: assetsError 
  } = useQuery<any[]>({
    queryKey: ['/api/assets'],
  });
  const assets = Array.isArray(assetsRaw) ? assetsRaw : [];

  // Fetch sensors for the selected asset
  const { 
    data: sensorsRaw, 
    isLoading: sensorsLoading,
    error: sensorsError
  } = useQuery<any[]>({
    queryKey: ['/api/sensors', { assetId: activeAssetId }],
    enabled: !!activeAssetId,
  });
  const sensors = Array.isArray(sensorsRaw) ? sensorsRaw : [];

  // Fetch historical sensor data
  const { 
    data: historicalDataRaw, 
    isLoading: historicalLoading,
    error: historicalError
  } = useQuery<any>({
    queryKey: [
      '/api/analytics/historical',
      { 
        assetId: activeAssetId, 
        sensorIds: activeSensorIds,
        startDate: dateRange.start,
        endDate: dateRange.end,
        interval
      }
    ],
    enabled: !!activeAssetId && activeSensorIds.length > 0,
  });
  const historicalData = historicalDataRaw && typeof historicalDataRaw === 'object' ? historicalDataRaw : {};

  // Initialize the first asset as active if none is selected
  useEffect(() => {
    if (!activeAssetId && Array.isArray(assets) && assets.length > 0) {
      dispatch(setActiveAssetId(assets[0].id));
    }
  }, [assets, activeAssetId, dispatch]);

  // Set historical data in redux when it changes
  useEffect(() => {
    if (historicalData && Object.keys(historicalData).length > 0) {
      dispatch(setTimeSeriesData(historicalData));
    }
  }, [historicalData, dispatch]);
  // Set loading state and error state
  useEffect(() => {
    dispatch(setLoading(
      assetsLoading || 
      sensorsLoading || 
      historicalLoading
    ));
    
    // Set error state if any of the queries have errors
    if (assetsError) {
      dispatch(setError('Failed to load assets. Please try again later.'));
    } else if (sensorsError && activeAssetId) {
      dispatch(setError('Failed to load sensors for the selected asset. Please try again later.'));
    } else if (historicalError && activeAssetId && activeSensorIds.length > 0) {
      dispatch(setError('Failed to load historical sensor data. Please try again later.'));
    } else {
      dispatch(setError(null));
    }
  }, [
    assetsLoading, sensorsLoading, historicalLoading,
    assetsError, sensorsError, historicalError,
    activeAssetId, activeSensorIds, dispatch
  ]);

  // Format time series data for raw data view
  const formattedTimeSeriesData = formatTimeSeriesData(
    timeSeriesData, 
    activeSensorIds, 
    sensors
  );

  // Format time series data for hourly aggregated view
  const hourlyAggregatedData = { ...formattedTimeSeriesData };
  if (hourlyAggregatedData.datasets) {
    hourlyAggregatedData.datasets = hourlyAggregatedData.datasets.map(dataset => {
      const sensorId = activeSensorIds.find(id => 
        dataset.label === (sensors?.find((s: any) => String(s.id) === String(id))?.name || `Sensor ${id}`)
      );
      if (sensorId && timeSeriesData[String(sensorId)]) {
        const aggregatedPoints = aggregateTimeSeriesData(
          timeSeriesData[String(sensorId)].dataPoints, 
          'hour'
        );
        return {
          ...dataset,
          data: aggregatedPoints.map(point => ({
            x: new Date(point.timestamp).getTime(),
            y: point.value,
          })),
        };
      }
      return dataset;
    });
  }

  // Format time series data for daily aggregated view
  const dailyAggregatedData = { ...formattedTimeSeriesData };
  if (dailyAggregatedData.datasets) {
    dailyAggregatedData.datasets = dailyAggregatedData.datasets.map(dataset => {
      const sensorId = activeSensorIds.find(id => 
        dataset.label === (sensors?.find((s: any) => String(s.id) === String(id))?.name || `Sensor ${id}`)
      );
      if (sensorId && timeSeriesData[String(sensorId)]) {
        const aggregatedPoints = aggregateTimeSeriesData(
          timeSeriesData[String(sensorId)].dataPoints, 
          'day'
        );
        return {
          ...dataset,
          data: aggregatedPoints.map(point => ({
            x: new Date(point.timestamp).getTime(),
            y: point.value,
          })),
        };
      }
      return dataset;
    });
  }

  // Select a different asset
  const handleAssetChange = (assetId: number) => {
    dispatch(setActiveAssetId(assetId));
  };
  const handleRetry = () => {
    window.location.reload();
  };
  // Add Export CSV handler
  const handleExportCSV = () => {
    // TODO: Implement CSV export logic
  };

  if (loading) {
    return <LoadingState message="Loading sensor data..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Sensor Data</h1>
          <p className="text-neutral-500">View and analyze historical sensor readings</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <RoleBasedAccess allowedRoles={['admin', 'engineer', 'analyst']}>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <i className="fas fa-download mr-2"></i>
              Export CSV
            </Button>
          </RoleBasedAccess>
          <Button size="sm" onClick={handleRetry}>
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
              assets.map((asset: any) => (
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Sensor Selector */}
          <SensorSelector 
            sensors={sensors} 
            loading={sensorsLoading} 
          />
          
          {/* Date Range Selector */}
          <DateRangeSelector />
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Time Series Chart Tabs */}
          <Tabs defaultValue="raw" className="space-y-4">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="raw">Raw Data</TabsTrigger>
                <TabsTrigger value="hourly">Hourly</TabsTrigger>
                <TabsTrigger value="daily">Daily</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center space-x-2">
                <Badge className="bg-neutral-100 text-neutral-700">
                  {activeSensorIds.length} sensors selected
                </Badge>
              </div>
            </div>
              <TabsContent value="raw" className="m-0">
              <Card className="border-neutral-200">
                <CardContent className="p-6">
                  {activeSensorIds.length === 0 ? (
                    <EmptyState 
                      icon="fas fa-chart-line"
                      title="No Sensors Selected"
                      message="Select one or more sensors from the sidebar to view their data"
                    />
                  ) : (
                    <TimeSeriesChart 
                      title="Raw Sensor Data"
                      data={formattedTimeSeriesData} 
                      loading={loading}
                      height={500}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="hourly" className="m-0">
              <Card className="border-neutral-200">
                <CardContent className="p-6">
                  {activeSensorIds.length === 0 ? (
                    <EmptyState 
                      icon="fas fa-chart-line"
                      title="No Sensors Selected"
                      message="Select one or more sensors from the sidebar to view aggregated hourly data"
                    />
                  ) : (
                    <TimeSeriesChart 
                      title="Hourly Aggregated Data"
                      data={hourlyAggregatedData} 
                      loading={loading}
                      height={500}
                      options={{
                        scales: {
                          x: {
                            time: {
                              unit: 'hour',
                            }
                          }
                        }
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="daily" className="m-0">
              <Card className="border-neutral-200">
                <CardContent className="p-6">
                  {activeSensorIds.length === 0 ? (
                    <EmptyState 
                      icon="fas fa-chart-line"
                      title="No Sensors Selected"
                      message="Select one or more sensors from the sidebar to view aggregated daily data"
                    />
                  ) : (
                    <TimeSeriesChart 
                      title="Daily Aggregated Data"
                      data={dailyAggregatedData} 
                      loading={loading}
                      height={500}
                      options={{
                        scales: {
                          x: {
                            time: {
                              unit: 'day',
                            }
                          }
                        }
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
            {/* Data Table */}
          <Card className="border-neutral-200">
            <CardHeader className="border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <CardTitle className="font-inter font-semibold text-lg text-neutral-900">
                  Sensor Readings
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <RoleBasedAccess allowedRoles={['admin', 'engineer', 'analyst']}>
                    <Button variant="outline" size="sm">
                      <i className="fas fa-filter mr-2"></i>
                      Filter
                    </Button>
                  </RoleBasedAccess>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Sensor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Asset</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-32" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-16" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Skeleton className="h-5 w-20 rounded-full" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-24" />
                          </td>
                        </tr>
                      ))                    ) : (
                      activeSensorIds.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8">
                            <div className="text-center">
                              <i className="fas fa-table text-3xl text-neutral-300 mb-3"></i>
                              <p className="text-neutral-500 mb-2">No sensor data to display</p>
                              <p className="text-neutral-400 text-sm">Select one or more sensors from the sidebar to view their data</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        Object.entries(timeSeriesData)
                          .filter(([id]) => activeSensorIds.map(String).includes(String(id)))
                          .flatMap(([id, series]) => {
                            const sensor = sensors.find((s: any) => String(s.id) === String(id));
                            const asset = assets.find((a: any) => a.id === (series.assetId || activeAssetId));
                            return Array.isArray(series.dataPoints) ? series.dataPoints.slice(0, 5).map((point, i) => (
                              <tr key={`${id}-${i}`} className="hover:bg-neutral-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                                  {new Date(point.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <p className="text-sm font-medium text-neutral-900">{sensor?.name || id}</p>
                                  <p className="text-xs text-neutral-500">{sensor?.type || ''}</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                                  {point.value.toFixed(2)} {sensor?.unit || ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge className={
                                    point.status === 'critical' ? 'bg-status-error text-white' :
                                    point.status === 'warning' ? 'bg-status-warning text-white' :
                                    'bg-status-success text-white'
                                  }>
                                    {point.status || 'normal'}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <p className="text-sm text-neutral-900">{asset?.name || `Asset ${series.assetId || activeAssetId}`}</p>
                                </td>
                              </tr>
                            )) : null;
                          })
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
