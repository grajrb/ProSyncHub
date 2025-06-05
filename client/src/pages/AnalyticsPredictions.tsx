import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import { formatTimeSeriesData } from '@/lib/chartUtils';

export default function AnalyticsPredictions() {
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [predictionRange, setPredictionRange] = useState('30d');

  // Define asset type
  type Asset = { id: number; name: string; [key: string]: any };

  // Fetch assets
  const { data: assets, isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });

  // Set initial selected asset
  useEffect(() => {
    if (
      !selectedAssetId &&
      Array.isArray(assets) &&
      assets.length > 0
    ) {
      setSelectedAssetId(assets[0].id);
    }
  }, [assets, selectedAssetId]);

  // Define prediction data type
  type PredictionData = {
    [sensorId: string]: {
      name: string;
      dataPoints: Array<{
        timestamp: string;
        value: number;
        upperBound?: number;
        lowerBound?: number;
      }>;
    };
  };

  // Fetch predictions for the selected asset
  const { data: predictions, isLoading: predictionsLoading } = useQuery<{ data: PredictionData }>({
    queryKey: ['/api/analytics/predictions', { 
      assetId: selectedAssetId, 
      range: predictionRange 
    }],
    enabled: !!selectedAssetId,
  });

  // Fetch current data for comparison
  const { data: currentData, isLoading: currentDataLoading } = useQuery<{ data: PredictionData }>({
    queryKey: ['/api/analytics/historical', { 
      assetId: selectedAssetId,
      range: '30d',
    }],
    enabled: !!selectedAssetId,
  });

  // Fetch maintenance predictions
  const { data: maintenancePredictions, isLoading: maintenanceLoading } = useQuery<{ data: any[] }>({
    queryKey: ['/api/maintenance/predictions', { assetId: selectedAssetId }],
    enabled: !!selectedAssetId,
  });

  // Format prediction data for chart
  const formattedPredictions = useMemo(() => {
    if (!predictions || !predictions.data) return { datasets: [] };

    const chartDatasets: { label: string; data: any; borderColor: string; backgroundColor: string; borderWidth: number; pointRadius: number; borderDash?: number[]; fill?: string; }[] = [];
    
    // Actual data (historical)
    if (currentData && currentData.data) {
      Object.entries(currentData.data).forEach(([_, data]: any) => {
        chartDatasets.push({
          label: `${data.name} (Actual)`,
          data: data.dataPoints.map((point: any) => ({
            x: new Date(point.timestamp),
            y: point.value,
          })),
          borderColor: 'rgba(59, 130, 246, 1)', // Blue
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointRadius: 2,
        });
      });
    }
    
    // Prediction data (future)
    Object.entries(predictions.data).forEach(([sensorId, data]: any) => {
      chartDatasets.push({
        label: `${data.name} (Predicted)`,
        data: data.dataPoints.map((point: any) => ({
          x: new Date(point.timestamp),
          y: point.value,
        })),
        borderColor: 'rgba(99, 102, 241, 1)', // Indigo
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
      });
      
      // Upper bound (confidence interval)
      chartDatasets.push({
        label: `${data.name} (Upper Bound)`,
        data: data.dataPoints.map((point: any) => ({
          x: new Date(point.timestamp),
          y: point.upperBound,
        })),
        borderColor: 'rgba(99, 102, 241, 0.3)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: '+1',
      });
      
      // Lower bound (confidence interval)
      chartDatasets.push({
        label: `${data.name} (Lower Bound)`,
        data: data.dataPoints.map((point: any) => ({
          x: new Date(point.timestamp),
          y: point.lowerBound,
        })),
        borderColor: 'rgba(99, 102, 241, 0.3)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: '-1',
      });
    });
    
    return { datasets: chartDatasets };
  }, [predictions, currentData]);

  // Calculate days to next predicted maintenance
  const getDaysToMaintenance = (date: string) => {
    const today = new Date();
    const maintenanceDate = new Date(date);
    const diffTime = maintenanceDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Select a different asset
  const handleAssetChange = (assetId: number) => {
    setSelectedAssetId(assetId);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Predictive Analytics</h1>
          <p className="text-neutral-500">Forecast future asset behavior and maintenance needs</p>
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
                  variant={selectedAssetId === asset.id ? "default" : "outline"}
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

      {/* Main Content */}
      <Tabs defaultValue="sensors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sensors">Sensor Predictions</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Predictions</TabsTrigger>
          <TabsTrigger value="failures">Failure Analysis</TabsTrigger>
        </TabsList>

        {/* Sensor Predictions Tab */}
        <TabsContent value="sensors" className="space-y-6">
          {/* Prediction Time Range */}
          <Card className="border-neutral-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-neutral-700">Prediction Range:</span>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant={predictionRange === '7d' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setPredictionRange('7d')}
                  >
                    7 Days
                  </Button>
                  <Button 
                    variant={predictionRange === '30d' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setPredictionRange('30d')}
                  >
                    30 Days
                  </Button>
                  <Button 
                    variant={predictionRange === '90d' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setPredictionRange('90d')}
                  >
                    90 Days
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Prediction Chart */}
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="font-inter font-semibold text-neutral-900">Sensor Value Predictions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {predictionsLoading || currentDataLoading ? (
                <Skeleton className="h-[400px] w-full rounded-lg" />
              ) : formattedPredictions.datasets.length > 0 ? (
                <TimeSeriesChart 
                  title="Projected Sensor Values with Confidence Intervals"
                  data={formattedPredictions} 
                  height={400}
                  options={{
                    plugins: {
                      tooltip: {
                        callbacks: {
                          title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            });
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <i className="fas fa-chart-line text-4xl text-neutral-300 mb-4"></i>
                  <p className="text-neutral-500">No prediction data available</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Prediction Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Prediction Accuracy</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="text-center py-6">
                  <div className="text-4xl font-bold text-neutral-900 mb-2">94.3%</div>
                  <p className="text-sm text-neutral-500">Based on historical data validation</p>
                </div>
                <div className="space-y-2 mt-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-600">Temperature</span>
                      <span className="text-neutral-900 font-medium">96.5%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-1.5">
                      <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: "96.5%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-600">Pressure</span>
                      <span className="text-neutral-900 font-medium">93.2%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-1.5">
                      <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: "93.2%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-600">Vibration</span>
                      <span className="text-neutral-900 font-medium">91.8%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-1.5">
                      <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: "91.8%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Anomaly Forecast</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-status-warning rounded-full"></div>
                        <p className="font-medium text-sm">Temperature Rise</p>
                      </div>
                      <Badge className="bg-neutral-100 text-neutral-700">
                        In 12 days
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">
                      Projected 15% increase in operating temperature
                    </p>
                  </div>
                  <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <p className="font-medium text-sm">Pressure Fluctuation</p>
                      </div>
                      <Badge className="bg-neutral-100 text-neutral-700">
                        In 18 days
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">
                      Potential irregular pressure pattern detected
                    </p>
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
                  <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-calendar-check text-blue-500 mt-1"></i>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">Schedule Inspection</p>
                        <p className="text-xs text-neutral-600">Inspect temperature sensors within 10 days</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-sliders-h text-green-500 mt-1"></i>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">Adjust Settings</p>
                        <p className="text-xs text-neutral-600">Reduce operating speed by 5% to prevent pressure fluctuations</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Maintenance Predictions Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="font-inter font-semibold text-neutral-900">Predicted Maintenance Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Component</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Maintenance Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Predicted Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {maintenanceLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-32" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-28" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-24" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-16" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Skeleton className="h-8 w-20 ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    maintenancePredictions?.data?.map((prediction: any) => {
                      const daysToMaintenance = getDaysToMaintenance(prediction.predictedDate);
                      
                      return (
                        <tr key={prediction.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <i className={`fas ${
                                prediction.componentType === 'motor' ? 'fa-cog' :
                                prediction.componentType === 'pump' ? 'fa-tint' :
                                prediction.componentType === 'filter' ? 'fa-filter' :
                                'fa-wrench'
                              } text-neutral-500`}></i>
                              <div>
                                <p className="text-sm font-medium text-neutral-900">{prediction.componentName}</p>
                                <p className="text-xs text-neutral-500">{prediction.componentType}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={
                              prediction.maintenanceType === 'replacement' ? 'bg-blue-100 text-blue-800' :
                              prediction.maintenanceType === 'repair' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }>
                              {prediction.maintenanceType}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm text-neutral-900">
                              {new Date(prediction.predictedDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {daysToMaintenance > 0 ? `in ${daysToMaintenance} days` : 'Today'}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-neutral-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    prediction.confidence >= 80 ? 'bg-green-500' :
                                    prediction.confidence >= 60 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`} 
                                  style={{ width: `${prediction.confidence}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-neutral-900">{prediction.confidence}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={
                              daysToMaintenance <= 7 ? 'bg-status-error text-white' :
                              daysToMaintenance <= 30 ? 'bg-status-warning text-white' :
                              'bg-status-success text-white'
                            }>
                              {daysToMaintenance <= 7 ? 'Critical' :
                               daysToMaintenance <= 30 ? 'Upcoming' :
                               'Scheduled'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Button size="sm">Schedule</Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
          
          {/* Maintenance Health Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Component Health Scores</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">Motor Bearings</span>
                      <span className="text-sm font-medium text-neutral-700">72%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "72%" }}></div>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Estimated remaining life: 153 days</p>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">Pump Seals</span>
                      <span className="text-sm font-medium text-neutral-700">45%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: "45%" }}></div>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Estimated remaining life: 42 days</p>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">Air Filters</span>
                      <span className="text-sm font-medium text-neutral-700">88%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "88%" }}></div>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Estimated remaining life: 215 days</p>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700">Drive Belt</span>
                      <span className="text-sm font-medium text-neutral-700">62%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "62%" }}></div>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Estimated remaining life: 98 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="font-inter font-semibold text-neutral-900">Maintenance Cost Forecast</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="p-4 border border-neutral-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-neutral-900">Next Quarter (Q3 2025)</h3>
                      <Badge className="bg-blue-100 text-blue-800">Estimated</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-neutral-500">Preventive</p>
                        <p className="text-lg font-bold text-neutral-900">$4,250</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">Corrective</p>
                        <p className="text-lg font-bold text-neutral-900">$1,800</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">Parts</p>
                        <p className="text-lg font-bold text-neutral-900">$2,350</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">Labor</p>
                        <p className="text-lg font-bold text-neutral-900">$3,700</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-neutral-200">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-neutral-900">Total</p>
                        <p className="text-lg font-bold text-neutral-900">$12,100</p>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        <i className="fas fa-arrow-down text-green-500 mr-1"></i>
                        12% lower than previous quarter
                      </p>
                    </div>
                  </div>
                  <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-lightbulb text-green-500 mt-1"></i>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">Cost Saving Opportunity</p>
                        <p className="text-xs text-neutral-600">
                          Bundling pump seal and bearing replacements could save $1,200 in labor costs.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Failure Analysis Tab */}
        <TabsContent value="failures" className="space-y-6">
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="font-inter font-semibold text-neutral-900">Failure Probability Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="p-4 border border-neutral-200 rounded-lg text-center">
                    <p className="text-sm text-neutral-500 mb-1">30-Day Failure Probability</p>
                    <p className="text-3xl font-bold text-red-500">12.4%</p>
                    <div className="flex items-center justify-center text-xs text-red-500 mt-1">
                      <i className="fas fa-arrow-up mr-1"></i>
                      3.2% increase
                    </div>
                  </div>
                  <div className="p-4 border border-neutral-200 rounded-lg text-center">
                    <p className="text-sm text-neutral-500 mb-1">90-Day Failure Probability</p>
                    <p className="text-3xl font-bold text-orange-500">27.8%</p>
                    <div className="flex items-center justify-center text-xs text-orange-500 mt-1">
                      <i className="fas fa-arrow-up mr-1"></i>
                      5.6% increase
                    </div>
                  </div>
                  <div className="p-4 border border-neutral-200 rounded-lg text-center">
                    <p className="text-sm text-neutral-500 mb-1">Mean Time Between Failures</p>
                    <p className="text-3xl font-bold text-neutral-900">182 days</p>
                    <div className="flex items-center justify-center text-xs text-green-500 mt-1">
                      <i className="fas fa-arrow-up mr-1"></i>
                      12 days improvement
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <div className="p-4 border border-neutral-200 rounded-lg h-full">
                    <h3 className="font-medium text-neutral-900 mb-3">Failure Mode Analysis</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-neutral-700">Bearing Failure</span>
                          <span className="text-sm font-medium text-neutral-700">42%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: "42%" }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-neutral-700">Seal Leakage</span>
                          <span className="text-sm font-medium text-neutral-700">28%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full" style={{ width: "28%" }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-neutral-700">Electrical Fault</span>
                          <span className="text-sm font-medium text-neutral-700">15%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "15%" }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-neutral-700">Corrosion</span>
                          <span className="text-sm font-medium text-neutral-700">10%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: "10%" }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-neutral-700">Other</span>
                          <span className="text-sm font-medium text-neutral-700">5%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div className="bg-neutral-500 h-2 rounded-full" style={{ width: "5%" }}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-neutral-200">
                      <h3 className="font-medium text-neutral-900 mb-3">Root Cause Analysis</h3>
                      <div className="space-y-2">
                        <div className="p-2 border border-red-200 rounded-lg bg-red-50">
                          <div className="flex items-start space-x-3">
                            <i className="fas fa-exclamation-circle text-red-500 mt-1"></i>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">Primary: Excessive Vibration</p>
                              <p className="text-xs text-neutral-600">
                                Linked to irregular maintenance intervals and operating conditions
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 border border-orange-200 rounded-lg bg-orange-50">
                          <div className="flex items-start space-x-3">
                            <i className="fas fa-exclamation-circle text-orange-500 mt-1"></i>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">Secondary: Thermal Stress</p>
                              <p className="text-xs text-neutral-600">
                                Operating above recommended temperature thresholds
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Preventive Actions */}
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="font-inter font-semibold text-neutral-900">Recommended Preventive Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Impact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Time Required</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  <tr className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-neutral-900">Replace Bearings</p>
                      <p className="text-xs text-neutral-500">Proactive replacement of worn bearings</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-green-100 text-green-800">High</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      $1,250
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      4 hours
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-status-error text-white">Critical</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button size="sm">Schedule</Button>
                    </td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-neutral-900">Adjust Operating Parameters</p>
                      <p className="text-xs text-neutral-500">Reduce operating temperature by 5°C</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-green-100 text-green-800">Medium</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      $0
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      1 hour
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-status-warning text-white">High</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button size="sm">Implement</Button>
                    </td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-neutral-900">Install Vibration Dampeners</p>
                      <p className="text-xs text-neutral-500">Add dampeners to reduce mechanical stress</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-green-100 text-green-800">Medium</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      $850
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      3 hours
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-blue-100 text-blue-800">Medium</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button size="sm">Schedule</Button>
                    </td>
                  </tr>
                  <tr className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-neutral-900">Increase Monitoring Frequency</p>
                      <p className="text-xs text-neutral-500">Daily vibration monitoring until issue resolved</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-green-100 text-green-800">Low</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      $200/week
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      30 mins/day
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-blue-100 text-blue-800">Medium</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button size="sm">Implement</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
