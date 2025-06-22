'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  status?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
  isLoading?: boolean;
}

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  status = 'default',
  className,
  isLoading = false
}: StatCardProps) {
  console.log('StatCard rendered:', { title, value, status });

  const statusColors = {
    default: 'border-industrial-gray-700 bg-industrial-charcoal',
    success: 'border-industrial-teal/50 bg-industrial-teal/10',
    warning: 'border-industrial-amber/50 bg-industrial-amber/10',
    error: 'border-industrial-red/50 bg-industrial-red/10'
  };

  const iconColors = {
    default: 'text-industrial-gray-400',
    success: 'text-industrial-teal',
    warning: 'text-industrial-amber',
    error: 'text-industrial-red'
  };

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-lg',
      statusColors[status],
      className
    )}>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-1/3 bg-industrial-gray-700 rounded" />
            <div className="h-8 w-1/2 bg-industrial-gray-700 rounded" />
            <div className="flex justify-end">
              <div className="h-10 w-10 bg-industrial-gray-700 rounded-lg" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-industrial-gray-400 uppercase tracking-wide">
                  {title}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-white">
                    {value}
                  </p>
                  {trend && (
                    <span className={cn(
                      'text-sm font-medium',
                      trend.isPositive ? 'text-industrial-teal' : 'text-industrial-red'
                    )}>
                      {trend.isPositive ? '+' : ''}{trend.value}%
                    </span>
                  )}
                </div>
              </div>
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg',
                status === 'success' && 'bg-industrial-teal/20',
                status === 'warning' && 'bg-industrial-amber/20',
                status === 'error' && 'bg-industrial-red/20',
                status === 'default' && 'bg-industrial-gray-800'
              )}>
                <Icon className={cn('h-6 w-6', iconColors[status])} />
              </div>
            </div>
            
            {/* Subtle bottom border for active status */}
            {status !== 'default' && (
              <div className={cn(
                'mt-4 h-1 w-full rounded-full',
                status === 'success' && 'bg-industrial-teal',
                status === 'warning' && 'bg-industrial-amber',
                status === 'error' && 'bg-industrial-red'
              )} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}