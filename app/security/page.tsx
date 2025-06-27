'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield,
  Lock,
  Key,
  UserCheck,
  AlertTriangle,
  Eye,
  Clock,
  Settings,
  CheckCircle,
  XCircle,
  Monitor,
  Smartphone,
  Globe
} from 'lucide-react';

// Mock security data
const securityEvents = [
  {
    id: '1',
    type: 'LOGIN_SUCCESS',
    user: 'supervisor',
    ip: '192.168.1.100',
    location: 'Detroit, MI',
    device: 'Desktop - Chrome',
    timestamp: '2024-12-22T14:30:00Z',
    severity: 'INFO'
  },
  {
    id: '2',
    type: 'LOGIN_FAILED',
    user: 'unknown_user',
    ip: '203.0.113.45',
    location: 'Unknown',
    device: 'Mobile - Safari',
    timestamp: '2024-12-22T13:45:00Z',
    severity: 'WARNING'
  },
  {
    id: '3',
    type: 'PERMISSION_DENIED',
    user: 'john.tech',
    ip: '192.168.1.105',
    location: 'Detroit, MI',
    device: 'Desktop - Firefox',
    timestamp: '2024-12-22T12:20:00Z',
    severity: 'WARNING'
  },
  {
    id: '4',
    type: 'PASSWORD_CHANGED',
    user: 'maintenance.crew',
    ip: '192.168.1.102',
    location: 'Detroit, MI',
    device: 'Desktop - Chrome',
    timestamp: '2024-12-22T11:15:00Z',
    severity: 'INFO'
  }
];

const activeSessions = [
  {
    id: '1',
    user: 'supervisor',
    ip: '192.168.1.100',
    location: 'Detroit, MI',
    device: 'Desktop - Chrome 120.0',
    loginTime: '2024-12-22T08:00:00Z',
    lastActivity: '2024-12-22T14:30:00Z',
    status: 'ACTIVE'
  },
  {
    id: '2',
    user: 'john.tech',
    ip: '192.168.1.105',
    location: 'Detroit, MI',
    device: 'Desktop - Firefox 121.0',
    loginTime: '2024-12-22T09:30:00Z',
    lastActivity: '2024-12-22T14:25:00Z',
    status: 'ACTIVE'
  },
  {
    id: '3',
    user: 'admin',
    ip: '192.168.1.101',
    location: 'Detroit, MI',
    device: 'Mobile - Safari 17.0',
    loginTime: '2024-12-22T07:45:00Z',
    lastActivity: '2024-12-22T14:20:00Z',
    status: 'IDLE'
  }
];

export default function SecurityPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [sessionTimeoutEnabled, setSessionTimeoutEnabled] = useState(true);
  const [auditLoggingEnabled, setAuditLoggingEnabled] = useState(true);
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  
  console.log('Security page rendered');

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'LOGIN_SUCCESS': return CheckCircle;
      case 'LOGIN_FAILED': return XCircle;
      case 'PERMISSION_DENIED': return Shield;
      case 'PASSWORD_CHANGED': return Key;
      default: return AlertTriangle;
    }
  };

  const getEventColor = (severity: string) => {
    switch (severity) {
      case 'INFO': return 'text-industrial-teal';
      case 'WARNING': return 'text-industrial-amber';
      case 'ERROR': return 'text-industrial-red';
      case 'CRITICAL': return 'text-industrial-red';
      default: return 'text-industrial-gray-400';
    }
  };

  const getDeviceIcon = (device: string) => {
    if (device.includes('Mobile')) return Smartphone;
    return Monitor;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-industrial-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-white">Security Center</h1>
        <p className="text-industrial-gray-400 mt-1">
          Monitor and manage system security settings and events
        </p>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Security Score</p>
                <p className="text-2xl font-bold text-industrial-teal">87%</p>
              </div>
              <Shield className="h-8 w-8 text-industrial-teal" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Active Sessions</p>
                <p className="text-2xl font-bold text-white">{activeSessions.length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-industrial-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Failed Logins</p>
                <p className="text-2xl font-bold text-industrial-amber">3</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-industrial-amber" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Security Events</p>
                <p className="text-2xl font-bold text-white">{securityEvents.length}</p>
              </div>
              <Eye className="h-8 w-8 text-industrial-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Settings and Monitoring */}
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="bg-industrial-gray-800 border-industrial-gray-700">
          <TabsTrigger value="settings" className="data-[state=active]:bg-industrial-blue">
            Security Settings
          </TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-industrial-blue">
            Security Events
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-industrial-blue">
            Active Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Authentication Settings */}
          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Authentication & Access Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Require additional verification for all user logins
                  </p>
                </div>
                <Switch 
                  checked={twoFactorEnabled} 
                  onCheckedChange={setTwoFactorEnabled}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">Session Timeout</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Automatically log out inactive users after 30 minutes
                  </p>
                </div>
                <Switch 
                  checked={sessionTimeoutEnabled} 
                  onCheckedChange={setSessionTimeoutEnabled}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">IP Address Whitelist</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Restrict access to approved IP addresses only
                  </p>
                </div>
                <Switch 
                  checked={ipWhitelistEnabled} 
                  onCheckedChange={setIpWhitelistEnabled}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">Comprehensive Audit Logging</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Log all user actions and system changes
                  </p>
                </div>
                <Switch 
                  checked={auditLoggingEnabled} 
                  onCheckedChange={setAuditLoggingEnabled}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>
            </CardContent>
          </Card>

          {/* Password Policy */}
          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="h-5 w-5" />
                Password Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-white font-medium">Minimum Requirements</h4>
                  <ul className="space-y-1 text-sm text-industrial-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-industrial-teal" />
                      At least 12 characters
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-industrial-teal" />
                      Include uppercase letters
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-industrial-teal" />
                      Include lowercase letters
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-industrial-teal" />
                      Include numbers
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-industrial-teal" />
                      Include special characters
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-white font-medium">Policy Settings</h4>
                  <ul className="space-y-1 text-sm text-industrial-gray-300">
                    <li>Password expiry: 90 days</li>
                    <li>Password history: 12 passwords</li>
                    <li>Account lockout: 5 failed attempts</li>
                    <li>Lockout duration: 30 minutes</li>
                  </ul>
                </div>
              </div>
              
              <div className="pt-4">
                <Button className="bg-industrial-blue hover:bg-industrial-blue/90">
                  <Settings className="h-4 w-4 mr-2" />
                  Update Password Policy
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents.map((event) => {
                  const EventIcon = getEventIcon(event.type);
                  const DeviceIcon = getDeviceIcon(event.device);
                  
                  return (
                    <div key={event.id} className="flex items-start gap-4 p-4 bg-industrial-gray-800 rounded-lg">
                      <div className={`p-2 rounded-lg ${
                        event.severity === 'WARNING' ? 'bg-industrial-amber/20' :
                        event.severity === 'ERROR' ? 'bg-industrial-red/20' :
                        'bg-industrial-teal/20'
                      }`}>
                        <EventIcon className={`h-5 w-5 ${getEventColor(event.severity)}`} />
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-white font-medium">
                            {event.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </h4>
                          <Badge className={
                            event.severity === 'WARNING' ? 'bg-industrial-amber text-black' :
                            event.severity === 'ERROR' ? 'bg-industrial-red text-white' :
                            'bg-industrial-teal text-black'
                          }>
                            {event.severity}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-industrial-gray-300">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-industrial-gray-400" />
                            <span>{event.user}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-industrial-gray-400" />
                            <span>{event.ip}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DeviceIcon className="h-4 w-4 text-industrial-gray-400" />
                            <span>{event.device}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-industrial-gray-400" />
                            <span>{new Date(event.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Active User Sessions</CardTitle>
                <Button variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
                  Refresh Sessions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSessions.map((session) => {
                  const DeviceIcon = getDeviceIcon(session.device);
                  
                  return (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-industrial-gray-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-industrial-blue/20 rounded-lg">
                          <DeviceIcon className="h-5 w-5 text-industrial-blue" />
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-white font-medium">{session.user}</h4>
                            <Badge className={
                              session.status === 'ACTIVE' ? 'bg-industrial-teal text-black' : 'bg-industrial-amber text-black'
                            }>
                              {session.status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-industrial-gray-300">
                            <span>{session.device}</span>
                            <span>{session.ip}</span>
                            <span>{session.location}</span>
                          </div>
                          
                          <div className="text-xs text-industrial-gray-400">
                            Login: {new Date(session.loginTime).toLocaleString()} • 
                            Last Activity: {new Date(session.lastActivity).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-industrial-red text-industrial-red hover:bg-industrial-red/10"
                      >
                        Terminate
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}