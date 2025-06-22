'use client';

import React from 'react';
import { Bell, Search, User, Settings, LogOut, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function Header() {
  console.log('Header component rendered');

  return (
    <header className="h-16 bg-industrial-charcoal border-b border-industrial-gray-700 px-6">
      <div className="flex h-full items-center justify-between">
        {/* Search */}
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-gray-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search assets, work orders..."
              className="pl-10 bg-industrial-gray-800 border-industrial-gray-600 text-white placeholder:text-industrial-gray-400 focus:border-industrial-blue"
            />
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-4">
          {/* System Health Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-industrial-gray-800 rounded-lg">
            <Zap className="h-4 w-4 text-industrial-teal animate-pulse-glow" />
            <span className="text-xs text-industrial-gray-300 font-medium">
              System Healthy
            </span>
          </div>

          {/* Real-time Data Flow Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-industrial-gray-800 rounded-lg">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-industrial-teal animate-pulse-glow" />
              <div className="h-1 w-6 bg-industrial-gray-600 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-industrial-teal animate-data-flow" />
              </div>
            </div>
            <span className="text-xs text-industrial-gray-300 font-medium">
              Live Data
            </span>
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative p-2 hover:bg-industrial-gray-800">
                <Bell className="h-5 w-5 text-industrial-gray-300" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-industrial-red"
                >
                  2
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-industrial-charcoal border-industrial-gray-700">
              <div className="p-4 border-b border-industrial-gray-700">
                <h3 className="font-semibold text-white">Notifications</h3>
                <p className="text-sm text-industrial-gray-400">You have 2 unread alerts</p>
              </div>
              <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                <div className="p-3 bg-industrial-gray-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-industrial-amber mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">High Vibration Alert</p>
                      <p className="text-xs text-industrial-gray-400">Motor MOT-002 showing abnormal levels</p>
                      <p className="text-xs text-industrial-gray-500 mt-1">2 minutes ago</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-industrial-gray-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-industrial-teal mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Work Order Assigned</p>
                      <p className="text-xs text-industrial-gray-400">New task for Motor Bearing Inspection</p>
                      <p className="text-xs text-industrial-gray-500 mt-1">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 p-2 hover:bg-industrial-gray-800">
                <div className="h-8 w-8 rounded-full bg-industrial-blue flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-white">Supervisor</p>
                  <p className="text-xs text-industrial-gray-400">supervisor@prosync.com</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-industrial-charcoal border-industrial-gray-700">
              <DropdownMenuItem className="text-white hover:bg-industrial-gray-800">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white hover:bg-industrial-gray-800">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-industrial-gray-700" />
              <DropdownMenuItem className="text-white hover:bg-industrial-gray-800">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}