'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings,
  Database,
  Globe,
  Bell,
  Palette,
  Shield,
  Download,
  Upload,
  RefreshCw,
  Save,
  Server,
  Monitor,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  Thermometer,
  Activity
} from 'lucide-react';

export default function SettingsPage() {
  // General settings
  const [siteName, setSiteName] = useState('ProSync Hub');
  const [timezone, setTimezone] = useState('America/Detroit');
  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  
  // System settings
  const [autoBackup, setAutoBackup] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [dataRetention, setDataRetention] = useState('365');
  
  // Integration settings
  const [apiEnabled, setApiEnabled] = useState(true);
  const [webhooksEnabled, setWebhooksEnabled] = useState(true);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  
  console.log('Settings page rendered');

  // Mock system health data
  const systemHealth = {
    cpu: 23,
    memory: 67,
    disk: 45,
    temperature: 58,
    uptime: '15 days, 4 hours',
    lastBackup: '2024-12-22T02:00:00Z'
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-industrial-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-white">System Settings</h1>
        <p className="text-industrial-gray-400 mt-1">
          Configure system preferences and operational parameters
        </p>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">CPU Usage</p>
                <p className="text-2xl font-bold text-white">{systemHealth.cpu}%</p>
              </div>
              <Cpu className="h-8 w-8 text-industrial-teal" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Memory</p>
                <p className="text-2xl font-bold text-white">{systemHealth.memory}%</p>
              </div>
              <MemoryStick className="h-8 w-8 text-industrial-blue" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Disk Usage</p>
                <p className="text-2xl font-bold text-white">{systemHealth.disk}%</p>
              </div>
              <HardDrive className="h-8 w-8 text-industrial-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Temperature</p>
                <p className="text-2xl font-bold text-white">{systemHealth.temperature}°C</p>
              </div>
              <Thermometer className="h-8 w-8 text-industrial-teal" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Uptime</p>
                <p className="text-lg font-bold text-white">15d 4h</p>
              </div>
              <Activity className="h-8 w-8 text-industrial-teal" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Status</p>
                <p className="text-lg font-bold text-industrial-teal">Healthy</p>
              </div>
              <Monitor className="h-8 w-8 text-industrial-teal" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-industrial-gray-800 border-industrial-gray-700">
          <TabsTrigger value="general" className="data-[state=active]:bg-industrial-blue">
            General
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-industrial-blue">
            System
          </TabsTrigger>
          <TabsTrigger value="database" className="data-[state=active]:bg-industrial-blue">
            Database
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-industrial-blue">
            Integrations
          </TabsTrigger>
          <TabsTrigger value="backup" className="data-[state=active]:bg-industrial-blue">
            Backup & Recovery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName" className="text-white">Site Name</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="bg-industrial-gray-800 border-industrial-gray-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-white">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="bg-industrial-gray-800 border-industrial-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-industrial-gray-800 border-industrial-gray-600">
                      <SelectItem value="America/Detroit">Eastern Time (Detroit)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (Chicago)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (Denver)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (Los Angeles)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-white">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="bg-industrial-gray-800 border-industrial-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-industrial-gray-800 border-industrial-gray-600">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dateFormat" className="text-white">Date Format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger className="bg-industrial-gray-800 border-industrial-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-industrial-gray-800 border-industrial-gray-600">
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance & Display
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">Dark Mode</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Use dark theme optimized for industrial environments
                  </p>
                </div>
                <Switch 
                  checked={true} 
                  disabled
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">High Contrast Mode</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Enhanced visibility for better readability
                  </p>
                </div>
                <Switch className="data-[state=checked]:bg-industrial-teal" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">Maintenance Mode</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Temporarily disable system access for maintenance
                  </p>
                </div>
                <Switch 
                  checked={maintenanceMode} 
                  onCheckedChange={setMaintenanceMode}
                  className="data-[state=checked]:bg-industrial-amber"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">Debug Mode</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Enable detailed logging for troubleshooting
                  </p>
                </div>
                <Switch 
                  checked={debugMode} 
                  onCheckedChange={setDebugMode}
                  className="data-[state=checked]:bg-industrial-red"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dataRetention" className="text-white">Data Retention (days)</Label>
                <Input
                  id="dataRetention"
                  value={dataRetention}
                  onChange={(e) => setDataRetention(e.target.value)}
                  className="bg-industrial-gray-800 border-industrial-gray-600 text-white"
                  placeholder="365"
                />
                <p className="text-xs text-industrial-gray-400">
                  Historical data older than this will be archived
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-white font-medium">PostgreSQL (Primary)</h4>
                  <div className="bg-industrial-gray-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-industrial-gray-400">Status</span>
                      <span className="text-industrial-teal">Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-industrial-gray-400">Version</span>
                      <span className="text-white">15.4</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-industrial-gray-400">Size</span>
                      <span className="text-white">2.3 GB</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-white font-medium">MongoDB (Time-Series)</h4>
                  <div className="bg-industrial-gray-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-industrial-gray-400">Status</span>
                      <span className="text-industrial-teal">Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-industrial-gray-400">Version</span>
                      <span className="text-white">7.0.4</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-industrial-gray-400">Size</span>
                      <span className="text-white">1.8 GB</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connections
                </Button>
                <Button variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
                  <Database className="h-4 w-4 mr-2" />
                  Optimize Databases
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="h-5 w-5" />
                External Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">REST API Access</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Enable external systems to access ProSync Hub API
                  </p>
                </div>
                <Switch 
                  checked={apiEnabled} 
                  onCheckedChange={setApiEnabled}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">Webhook Notifications</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Send real-time notifications to external endpoints
                  </p>
                </div>
                <Switch 
                  checked={webhooksEnabled} 
                  onCheckedChange={setWebhooksEnabled}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">Single Sign-On (SSO)</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Integrate with corporate identity providers
                  </p>
                </div>
                <Switch 
                  checked={ssoEnabled} 
                  onCheckedChange={setSsoEnabled}
                  className="data-[state=checked]:bg-industrial-blue"
                />
              </div>
              
              {apiEnabled && (
                <div className="bg-industrial-gray-800 p-4 rounded-lg">
                  <h4 className="text-white font-medium mb-2">API Configuration</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-industrial-gray-400">Base URL</span>
                      <span className="text-white font-mono">https://api.prosync.local/v1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-industrial-gray-400">Rate Limit</span>
                      <span className="text-white">1000 requests/hour</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <Card className="bg-industrial-charcoal border-industrial-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Backup & Recovery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-white font-medium">Automatic Backups</h4>
                  <p className="text-sm text-industrial-gray-400">
                    Daily automated backups at 2:00 AM
                  </p>
                </div>
                <Switch 
                  checked={autoBackup} 
                  onCheckedChange={setAutoBackup}
                  className="data-[state=checked]:bg-industrial-teal"
                />
              </div>
              
              <div className="bg-industrial-gray-800 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-3">Backup Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-industrial-gray-400">Last Backup</span>
                    <span className="text-white">
                      {new Date(systemHealth.lastBackup).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-industrial-gray-400">Backup Size</span>
                    <span className="text-white">1.2 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-industrial-gray-400">Retention</span>
                    <span className="text-white">30 days</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button className="bg-industrial-blue hover:bg-industrial-blue/90">
                  <Download className="h-4 w-4 mr-2" />
                  Create Backup Now
                </Button>
                <Button variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
                  <Upload className="h-4 w-4 mr-2" />
                  Restore from Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-industrial-teal hover:bg-industrial-teal/90 text-black">
          <Save className="h-4 w-4 mr-2" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}