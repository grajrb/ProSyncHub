'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Settings,
  Package,
  Wrench,
  Users,
  BarChart3,
  Bell,
  Shield,
  Factory
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Assets', href: '/assets', icon: Package },
  { name: 'Work Orders', href: '/work-orders', icon: Wrench },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Security', href: '/security', icon: Shield },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  console.log('Current pathname:', pathname);

  return (
    <div className="flex h-full w-64 flex-col bg-industrial-charcoal border-r border-industrial-gray-700">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-industrial-gray-700">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-industrial-blue">
          <Factory className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">ProSync Hub</h1>
          <p className="text-xs text-industrial-gray-400">Asset Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-industrial-blue text-white shadow-lg'
                  : 'text-industrial-gray-300 hover:text-white hover:bg-industrial-gray-800'
              )}
            >
              <item.icon 
                className={cn(
                  'h-5 w-5 transition-colors',
                  isActive 
                    ? 'text-white' 
                    : 'text-industrial-gray-400 group-hover:text-industrial-teal'
                )} 
              />
              {item.name}
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-industrial-teal animate-pulse-glow" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-industrial-gray-700">
        <div className="bg-industrial-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-industrial-gray-400 font-medium">System Status</span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-industrial-teal animate-pulse-glow" />
              <span className="text-xs text-industrial-teal font-medium">Online</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-industrial-gray-400">CPU</span>
              <span className="text-white">23%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-industrial-gray-400">Memory</span>
              <span className="text-white">67%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-industrial-gray-400">Active Assets</span>
              <span className="text-industrial-teal font-medium">3/4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}