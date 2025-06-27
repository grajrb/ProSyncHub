'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Bell,
  Mail,
  MessageSquare,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Trash2,
  Check,
  Settings,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor
} from 'lucide-react';
import { mockNotifications } from '../lib/mock-data';

// Extended mock notifications
const extendedNotifications = [
  ...mockNotifications,
  {
    id: '3',
    user_id: 'user-1',
    title: 'Maintenance Completed',
    message: 'Quarterly maintenance for Air Compressor CMP-003 has been completed successfully',
    type: 'success' as const,
    read: true,
    created_at: '2024-12-22T10:00:00Z',
    related_entity_type: 'asset',
    related_entity_id: '3'
  },
  {
    id: '4',
    user_id: 'user-1',
    title: 'System Update Available',
    message: 'ProSync Hub v2.1.0 is available for installation. Includes security patches and performance improvements.',
    type: 'info' as const,
    read: false,
    created_at: '2024-12-22T06:00:00Z'
  },
  {
    id: '5',
    user_id: 'user-1',
    title: 'Sensor Calibration Due',
    message: 'Temperature sensors on HVAC-004 require calibration within 7 days',
    type: 'warning' as const,
    read: true,
    created_at: '2024-12-21T16:30:00Z',
    related_entity_type: 'asset',
    related_entity_id: '4'
  }
];

export default function NotificationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Notification preferences
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [desktopEnabled, setDesktopEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  console.log('Notifications page rendered with', extendedNotifications.length, 'notifications');

  const filteredNotifications = extendedNotifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'ALL' || notification.type.toUpperCase() === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'READ' && notification.read) ||
                         (statusFilter === 'unread' && !notification.read);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error': return XCircle;
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      case 'info': return Info;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string, read: boolean) => {
    const opacity = read ? '20' : '40';
    switch (type) {
      case 'error': return `bg-industrial-red/${opacity} border-industrial-red/50`;
      case 'warning': return `bg-industrial-amber/${opacity} border-industrial-amber/50`;
      case 'success': return `bg-industrial-teal/${opacity} border-industrial-teal/50`;
      case 'info': return `bg-industrial-blue/${opacity} border-industrial-blue/50`;
      default: return `bg-industrial-gray-800 border-industrial-gray-700`;
    }
  };

  const typeStats = extendedNotifications.reduce((acc, notification) => {
    acc[notification.type] = (acc[notification.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unreadCount = extendedNotifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-industrial-gray-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications Center</h1>
          <p className="text-industrial-gray-400 mt-1">
            Manage alerts, messages, and notification preferences
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-industrial-blue text-white">
              {unreadCount} Unread
            </Badge>
            <Badge variant="outline" className="border-industrial-gray-600 text-industrial-gray-300">
              {extendedNotifications.length} Total
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Notification Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Total</p>
                <p className="text-2xl font-bold text-white">{extendedNotifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-industrial-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Unread</p>
                <p className="text-2xl font-bold text-industrial-blue">{unreadCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-industrial-blue" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Warnings</p>
                <p className="text-2xl font-bold text-industrial-amber">{typeStats.warning || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-industrial-amber" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Errors</p>
                <p className="text-2xl font-bold text-industrial-red">{typeStats.error || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-industrial-red" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Success</p>
                <p className="text-2xl font-bold text-industrial-teal">{typeStats.success || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-industrial-teal" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Notifications and Settings */}
      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="bg-industrial-gray-800 border-industrial-gray-700">
          <TabsTrigger value="notifications" className="data-[state=active]:bg-industrial-blue">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="data-[state=active]:bg-industrial-blue">
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-gray-400 h-4 w-4" />
              <Input
                type="search"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-industrial-gray-800 border-industrial-gray-600 text-white placeholder:text-industrial-gray-400"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-industrial-gray-400" />
              <div className="flex gap-2">
                {['ALL', 'ERROR', 'WARNING', 'SUCCESS', 'INFO'].map((type) => (
                  <Button
                    key={type}
                    variant={typeFilter === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(type)}
                    className={
                      typeFilter === type
                        ? "bg-industrial-blue hover:bg-industrial-blue/90"
                        : "border-industrial-gray-600 text-industrial-gray-300 hover:bg-industrial-gray-800"
                    }
                  >
                    {type === 'ALL' ? `All (${extendedNotifications.length})` : 
                     `${type} (${typeStats[type.toLowerCase()] || 0})`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {['ALL', 'unread', 'read'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={
                    statusFilter === status
                      ? "bg-industrial-teal hover:bg-industrial-teal/90 text-black"
                      : "border-industrial-gray-600 text-industrial-gray-300 hover:bg-industrial-gray-800"
                  }
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const NotificationIcon = getNotificationIcon(notification.type);
              
              return (
                <Card 
                  key={notification.id} 
                  className={`border transition-all duration-200 hover:shadow-lg cursor-pointer ${
                    getNotificationColor(notification.type, notification.read)
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        notification.type === 'error' ? 'bg-industrial-red/30' :
                        notification.type === 'warning' ? 'bg-industrial-amber/30' :
                        notification.type === 'success' ? 'bg-industrial-teal/30' :
                        'bg-industrial-blue/30'
                      }`}>
                        <NotificationIcon className={`h-5 w-5 ${
                          notification.type === 'error' ? 'text-industrial-red' :
                          notification.type === 'warning' ? 'text-industrial-amber' :
                          notification.type === 'success' ? 'text-industrial-teal' :
                          'text-industrial-blue'
                        }`} />
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-medium ${notification.read ? 'text-industrial-gray-300' : 'text-white'}`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge className={`${
                              notification.type === 'error' ? 'bg-industrial-red text-white' :
                              notification.type === 'warning' ? 'bg-industrial-amber text-black' :
                              notification.type === 'success' ? 'bg-industrial-teal text-black' :
                              'bg-industrial-blue text-white'
                            }`}>
                              {notification.type.toUpperCase()}
                            </Badge>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-industrial-blue animate-pulse-glow" />
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-sm ${notification.read ? 'text-industrial-gray-400' : 'text-industrial-gray-300'}`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-industrial-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(notification.created_at).toLocaleString()}</span>
                            {notification.related_entity_type && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{notification.related_entity_type}</span>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Button size="sm" variant="outline" className="border-industrial-blue text-industrial-blue hover:bg-industrial-blue/10">
                                Mark Read
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-industrial-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No notifications found</h3>
              <p className="text-industrial-gray-400">
                Try adjusting your search criteria or filters
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          {/* Notification Channels */}
          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-industrial-blue" />
                  <div className="space-y-1">
                    <h4 className="text-white font-medium">Email Notifications</h4>
                    <p className="text-sm text-industrial-gray-400">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={emailEnabled} 
                  onCheckedChange={setEmailEnabled}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-industrial-teal" />
                  <div className="space-y-1">
                    <h4 className="text-white font-medium">Desktop Notifications</h4>
                    <p className="text-sm text-industrial-gray-400">
                      Show browser notifications on desktop
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={desktopEnabled} 
                  onCheckedChange={setDesktopEnabled}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-industrial-amber" />
                  <div className="space-y-1">
                    <h4 className="text-white font-medium">Push Notifications</h4>
                    <p className="text-sm text-industrial-gray-400">
                      Receive push notifications on mobile devices
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={pushEnabled} 
                  onCheckedChange={setPushEnabled}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-industrial-gray-400" />
                  <div className="space-y-1">
                    <h4 className="text-white font-medium">SMS Notifications</h4>
                    <p className="text-sm text-industrial-gray-400">
                      Receive critical alerts via SMS
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={smsEnabled} 
                  onCheckedChange={setSmsEnabled}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="h-5 w-5 text-industrial-teal" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-industrial-gray-400" />
                  )}
                  <div className="space-y-1">
                    <h4 className="text-white font-medium">Sound Alerts</h4>
                    <p className="text-sm text-industrial-gray-400">
                      Play sound for notifications
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={soundEnabled} 
                  onCheckedChange={setSoundEnabled}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Notification Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Asset Alerts</h4>
                    <div className="space-y-2">
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-industrial-gray-300">Critical asset failures</span>
                        <Switch defaultChecked className="data-[state=checked]:bg-industrial-red" />
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-industrial-gray-300">High temperature warnings</span>
                        <Switch defaultChecked className="data-[state=checked]:bg-industrial-amber" />
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-industrial-gray-300">Maintenance due reminders</span>
                        <Switch defaultChecked className="data-[state=checked]:bg-industrial-teal" />
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Work Orders</h4>
                    <div className="space-y-2">
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-industrial-gray-300">New work order assignments</span>
                        <Switch defaultChecked className="data-[state=checked]:bg-industrial-blue" />
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-industrial-gray-300">Work order status changes</span>
                        <Switch defaultChecked className="data-[state=checked]:bg-industrial-teal" />
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-industrial-gray-300">Overdue work orders</span>
                        <Switch defaultChecked className="data-[state=checked]:bg-industrial-amber" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6">
                <Button className="bg-industrial-blue hover:bg-industrial-blue/90">
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}