import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AssetCard from "@/components/AssetCard";
import { connectWebSocket } from "@/lib/websocket";
import { updateAsset } from "@/store/slices/assetSlice";
import { updateWorkOrder } from "@/store/slices/workOrderSlice";
import { addNotification } from "@/store/slices/notificationSlice";

export default function Dashboard() {
  const dispatch = useDispatch();

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  // Fetch recent assets
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ["/api/assets", { limit: 5 }],
  });

  // Fetch recent work orders
  const { data: workOrders, isLoading: workOrdersLoading } = useQuery({
    queryKey: ["/api/work-orders", { limit: 5 }],
  });

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications", { unreadOnly: true }],
  });

  // Setup WebSocket connection
  useEffect(() => {
    const ws = connectWebSocket();
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'ASSET_UPDATED':
          dispatch(updateAsset(data.payload));
          break;
        case 'WORK_ORDER_UPDATED':
          dispatch(updateWorkOrder(data.payload));
          break;
        case 'SENSOR_READING':
          // Handle real-time sensor data
          console.log('Sensor reading:', data.payload);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    };

    return () => {
      ws.close();
    };
  }, [dispatch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-status-success';
      case 'maintenance': return 'bg-status-warning';
      case 'offline': return 'bg-status-error';
      case 'error': return 'bg-status-error';
      default: return 'bg-neutral-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-status-error text-white';
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-status-success text-white';
      case 'in_progress': return 'bg-status-warning text-white';
      case 'open': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-status-error text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm font-medium">Total Assets</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-neutral-900 mt-2">
                    {metrics?.totalAssets || 0}
                  </p>
                )}
                <p className="text-status-success text-sm mt-1">
                  <i className="fas fa-arrow-up mr-1"></i>
                  +5.2% from last month
                </p>
              </div>
              <div className="bg-primary-100 p-3 rounded-lg">
                <i className="fas fa-cogs text-primary-500 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm font-medium">Operational</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-neutral-900 mt-2">
                    {metrics?.operationalAssets || 0}
                  </p>
                )}
                <p className="text-status-success text-sm mt-1">
                  {metrics && metrics.totalAssets > 0 
                    ? `${((metrics.operationalAssets / metrics.totalAssets) * 100).toFixed(1)}% uptime`
                    : "0% uptime"}
                </p>
              </div>
              <div className="bg-secondary-50 p-3 rounded-lg">
                <i className="fas fa-check-circle text-secondary-500 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm font-medium">Active Work Orders</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-neutral-900 mt-2">
                    {metrics?.activeWorkOrders || 0}
                  </p>
                )}
                <p className="text-accent-500 text-sm mt-1">
                  <i className="fas fa-clock mr-1"></i>
                  8 due today
                </p>
              </div>
              <div className="bg-accent-50 p-3 rounded-lg">
                <i className="fas fa-clipboard-list text-accent-500 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm font-medium">Alerts</p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-neutral-900 mt-2">
                    {metrics?.activeAlerts || 0}
                  </p>
                )}
                <p className="text-status-error text-sm mt-1">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  3 critical
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <i className="fas fa-exclamation-triangle text-status-error text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Asset Monitoring */}
        <div className="lg:col-span-2">
          <Card className="border-neutral-200">
            <CardHeader className="border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <CardTitle className="font-inter font-semibold text-lg text-neutral-900">
                  Real-time Asset Monitoring
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-status-success rounded-full animate-pulse"></div>
                    <span className="text-sm text-neutral-600">Live</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {assetsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-6 w-20 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {assets?.map((asset: any) => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Content */}
        <div className="space-y-6">
          {/* Active Alerts */}
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="font-inter font-semibold text-neutral-900">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications?.slice(0, 3).map((notification: any) => (
                <div 
                  key={notification.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${
                    notification.type === 'error' ? 'bg-red-50 border-red-200' :
                    notification.type === 'warning' ? 'bg-orange-50 border-orange-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <i className={`fas ${
                    notification.type === 'error' ? 'fa-exclamation-triangle text-status-error' :
                    notification.type === 'warning' ? 'fa-exclamation-circle text-status-warning' :
                    'fa-info-circle text-status-info'
                  } mt-1`}></i>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">{notification.title}</p>
                    <p className="text-xs text-neutral-600">{notification.message}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {new Date(notification.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-neutral-500 text-center py-4">No active alerts</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Maintenance */}
          <Card className="border-neutral-200">
            <CardHeader>
              <CardTitle className="font-inter font-semibold text-neutral-900">Upcoming Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Compressor C-501</p>
                  <p className="text-xs text-neutral-600">Preventive Maintenance</p>
                </div>
                <Badge className="bg-accent-100 text-accent-700">Today</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Filter F-203</p>
                  <p className="text-xs text-neutral-600">Filter Replacement</p>
                </div>
                <Badge className="bg-neutral-100 text-neutral-700">Tomorrow</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Motor M-301</p>
                  <p className="text-xs text-neutral-600">Lubrication Service</p>
                </div>
                <Badge className="bg-neutral-100 text-neutral-700">Wed</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Work Orders */}
      <Card className="border-neutral-200">
        <CardHeader className="border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <CardTitle className="font-inter font-semibold text-lg text-neutral-900">
              Recent Work Orders
            </CardTitle>
            <Button variant="ghost" className="text-primary-500 hover:text-primary-600">
              View all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Work Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Due Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {workOrdersLoading ? (
                  Array.from({ length: 3 }, (_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-6 w-12 rounded-full" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-20" />
                      </td>
                    </tr>
                  ))
                ) : (
                  workOrders?.map((order: any) => (
                    <tr key={order.id} className="hover:bg-neutral-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-mono font-medium text-neutral-900">WO-{order.id}</p>
                          <p className="text-sm text-neutral-600">{order.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-neutral-900">Asset #{order.assetId}</p>
                        <p className="text-sm text-neutral-600">Plant A</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={
                          order.type === 'preventive' ? 'bg-green-100 text-green-800' :
                          order.type === 'corrective' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {order.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getPriorityColor(order.priority)}>
                          {order.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusBadgeColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
