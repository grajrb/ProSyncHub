import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);


export default function AnalyticsReports() {
  const [reportType, setReportType] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch reports
  const { data: reports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ['/api/reports', { type: reportType === 'all' ? undefined : reportType }],
    queryFn: async () => {
      const url = '/api/reports';
      const params = reportType === 'all' ? {} : { type: reportType };
      const response = await axios.get(url, { params });
      return response.data;
    },
    initialData: [], // Provide an empty array as initial data
  });

  // Event Log Analytics Integration
  const { data: eventLogAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/event-logs/analytics'],
    queryFn: async () => {
      const res = await axios.get('/api/event-logs/analytics');
      return res.data;
    },
  });
  // Predictive Alerts (Event Logs)
  const { data: predictiveAlerts, isLoading: predictiveLoading } = useQuery({
    queryKey: ['/api/event-logs/predictive-alerts'],
    queryFn: async () => {
      const res = await axios.get('/api/event-logs/predictive-alerts');
      return res.data;
    },
  });
  // Chat Analytics
  const { data: chatKpi, isLoading: chatKpiLoading } = useQuery({
    queryKey: ['/api/chat/kpi'],
    queryFn: async () => {
      const res = await axios.get('/api/chat/kpi');
      return res.data;
    },
  });
  const { data: chatStats, isLoading: chatStatsLoading } = useQuery({
    queryKey: ['/api/chat/stats'],
    queryFn: async () => {
      const res = await axios.get('/api/chat/stats');
      return res.data;
    },
  });
  // Checklist Analytics
  const { data: checklistAnalytics, isLoading: checklistLoading } = useQuery({
    queryKey: ['/api/checklists/analytics'],
    queryFn: async () => {
      const res = await axios.get('/api/checklists/analytics');
      return res.data;
    },
  });

  // Prepare chart data for trend
  const trendLabels = eventLogAnalytics?.trend?.map((t: any) => t.day) || [];
  const trendCounts = eventLogAnalytics?.trend?.map((t: any) => t.count) || [];
  const movingAvg = eventLogAnalytics?.movingAvg?.map((t: any) => t.movingAvg) || [];
  const trendChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Event Count',
        data: trendCounts,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.1)',
        tension: 0.3,
      },
      {
        label: '3-Day Moving Avg',
        data: movingAvg,
        borderColor: '#f59e42',
        backgroundColor: 'rgba(245,158,66,0.1)',
        borderDash: [5, 5],
        tension: 0.3,
      },
    ],
  };
  const trendChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Event Log Trend (Last 30 Days)' },
    },
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: { title: { display: true, text: 'Count' }, beginAtZero: true },
    },
  };

  // Chat per day chart
  const chatPerDayLabels = chatStats?.perDay ? Object.keys(chatStats.perDay) : [];
  const chatPerDayCounts = chatStats?.perDay ? Object.values(chatStats.perDay) : [];
  const chatPerDayData = {
    labels: chatPerDayLabels,
    datasets: [
      {
        label: 'Chat Messages per Day',
        data: chatPerDayCounts,
        backgroundColor: '#2563eb',
      },
    ],
  };
  // Checklist per type chart
  const checklistTypeLabels = checklistAnalytics?.perType ? Object.keys(checklistAnalytics.perType) : [];
  const checklistTypeCounts = checklistAnalytics?.perType ? Object.values(checklistAnalytics.perType) : [];
  const checklistTypeData = {
    labels: checklistTypeLabels,
    datasets: [
      {
        label: 'Checklists by Type',
        data: checklistTypeCounts,
        backgroundColor: '#059669',
      },
    ],
  };

  // Simulate report generation
  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get icon for report type
  const getReportIcon = (type: string) => {
    switch (type) {
      case 'performance': return 'fas fa-tachometer-alt';
      case 'maintenance': return 'fas fa-wrench';
      case 'efficiency': return 'fas fa-bolt';
      case 'compliance': return 'fas fa-clipboard-check';
      case 'incident': return 'fas fa-exclamation-triangle';
      default: return 'fas fa-file-alt';
    }
  };

  // Get color for report type
  const getReportColor = (type: string) => {
    switch (type) {
      case 'performance': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'efficiency': return 'bg-green-100 text-green-800';
      case 'compliance': return 'bg-purple-100 text-purple-800';
      case 'incident': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
          <p className="text-neutral-500">Generate and view analytical reports</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <i className="fas fa-plus mr-2"></i>
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Generate New Report</DialogTitle>
                <DialogDescription>
                  Create a custom report based on your specific requirements.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input id="report-name" placeholder="e.g. Monthly Maintenance Summary" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select defaultValue="performance">
                    <SelectTrigger id="report-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="efficiency">Efficiency</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="incident">Incident</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input id="start-date" type="date" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input id="end-date" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Include Data</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-sensors" defaultChecked />
                      <label htmlFor="include-sensors" className="text-sm">Sensor readings</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-maintenance" defaultChecked />
                      <label htmlFor="include-maintenance" className="text-sm">Maintenance records</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-incidents" defaultChecked />
                      <label htmlFor="include-incidents" className="text-sm">Incidents</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-charts" defaultChecked />
                      <label htmlFor="include-charts" className="text-sm">Charts and visualizations</label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleGenerateReport} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Generating...
                    </>
                  ) : (
                    'Generate Report'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Report Filters */}
      <Card className="border-neutral-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-4">
              <div className="w-48">
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reports</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="efficiency">Efficiency</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select defaultValue="recent">
                  <SelectTrigger>
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <i className="fas fa-filter mr-2"></i>
                More Filters
              </Button>
              <Button variant="outline" size="sm">
                <i className="fas fa-search mr-2"></i>
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Event Log Analytics Chart */}
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="font-inter font-semibold text-lg text-neutral-900">
            Event Log Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="w-full overflow-x-auto">
              <Line data={trendChartData} options={trendChartOptions} height={80} />
            </div>
          )}
        </CardContent>
      </Card>
      {/* Predictive Alerts */}
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="font-inter font-semibold text-lg text-neutral-900">
            Predictive Alerts (Event Logs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {predictiveLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : predictiveAlerts?.length ? (
            <ul className="space-y-2">
              {predictiveAlerts.map((alert: any, idx: number) => (
                <li key={idx} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <span className="font-semibold">{alert.type}:</span> {alert.message || alert.count + ' events'}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-neutral-500">No predictive alerts.</div>
          )}
        </CardContent>
      </Card>
      {/* Chat Analytics Chart */}
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="font-inter font-semibold text-lg text-neutral-900">
            Chat Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chatStatsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="w-full overflow-x-auto">
              <Bar data={chatPerDayData} height={80} />
              <div className="mt-4">
                <span className="font-semibold">Total Messages:</span> {chatKpi?.totalMessages ?? '-'} | <span className="font-semibold">Active Users:</span> {chatKpi?.activeUsers ?? '-'} | <span className="font-semibold">Avg Response Time:</span> {chatKpi?.avgResponseTime ?? '-'} min
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Checklist Analytics Chart */}
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="font-inter font-semibold text-lg text-neutral-900">
            Checklist Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checklistLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="w-full overflow-x-auto">
              <Bar data={checklistTypeData} height={80} />
            </div>
          )}
        </CardContent>
      </Card>
      {/* Reports List */}
      <Card className="border-neutral-200">
        <CardHeader className="border-b border-neutral-200">
          <CardTitle className="font-inter font-semibold text-lg text-neutral-900">
            Available Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {reportsLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {reports?.length > 0 ? (
                reports.map((report: any) => (
                  <div key={report.id} className="p-6 flex items-start space-x-4 hover:bg-neutral-50">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      report.type === 'performance' ? 'bg-blue-50' :
                      report.type === 'maintenance' ? 'bg-orange-50' :
                      report.type === 'efficiency' ? 'bg-green-50' :
                      report.type === 'compliance' ? 'bg-purple-50' :
                      report.type === 'incident' ? 'bg-red-50' :
                      'bg-gray-50'
                    }`}>
                      <i className={`${getReportIcon(report.type)} text-lg ${
                        report.type === 'performance' ? 'text-blue-600' :
                        report.type === 'maintenance' ? 'text-orange-600' :
                        report.type === 'efficiency' ? 'text-green-600' :
                        report.type === 'compliance' ? 'text-purple-600' :
                        report.type === 'incident' ? 'text-red-600' :
                        'text-gray-600'
                      }`}></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-neutral-900">{report.name}</h3>
                          <p className="text-sm text-neutral-500 mt-1">{report.description}</p>
                          <div className="flex items-center space-x-3 mt-2">
                            <Badge className={getReportColor(report.type)}>
                              {report.type}
                            </Badge>
                            <span className="text-xs text-neutral-500">
                              Generated: {formatDate(report.createdAt)}
                            </span>
                            <span className="text-xs text-neutral-500">
                              By: {report.createdBy}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <i className="fas fa-eye mr-2"></i>
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <i className="fas fa-download"></i>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-file-alt text-neutral-400 text-xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">No reports found</h3>
                  <p className="text-neutral-500 mb-6">There are no reports matching your current filters.</p>
                  <Button>Generate New Report</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Scheduled Reports */}
      <Card className="border-neutral-200">
        <CardHeader className="border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <CardTitle className="font-inter font-semibold text-lg text-neutral-900">
              Scheduled Reports
            </CardTitle>
            <Button variant="outline" size="sm">
              <i className="fas fa-plus mr-2"></i>
              Schedule New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Report Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Recipients</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Next Run</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              <tr className="hover:bg-neutral-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-chart-line text-blue-500"></i>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Monthly Performance Report</p>
                      <p className="text-xs text-neutral-500">All assets</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                  Monthly
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                  5 recipients
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                  July 1, 2025
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-neutral-900">
                  <Button variant="ghost" size="sm" className="text-neutral-700">
                    <i className="fas fa-ellipsis-h"></i>
                  </Button>
                </td>
              </tr>
              <tr className="hover:bg-neutral-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-wrench text-orange-500"></i>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Weekly Maintenance Summary</p>
                      <p className="text-xs text-neutral-500">Critical assets</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                  Weekly
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                  3 recipients
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                  June 10, 2025
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-neutral-900">
                  <Button variant="ghost" size="sm" className="text-neutral-700">
                    <i className="fas fa-ellipsis-h"></i>
                  </Button>
                </td>
              </tr>
              <tr className="hover:bg-neutral-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-bolt text-green-500"></i>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Energy Efficiency Report</p>
                      <p className="text-xs text-neutral-500">Production line</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                  Quarterly
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                  7 recipients
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                  September 1, 2025
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-neutral-900">
                  <Button variant="ghost" size="sm" className="text-neutral-700">
                    <i className="fas fa-ellipsis-h"></i>
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
