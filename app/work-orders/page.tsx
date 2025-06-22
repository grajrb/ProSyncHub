'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wrench,
  Package
} from 'lucide-react';
import { mockWorkOrders } from '../lib/mock-data';

export default function WorkOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  console.log('Work Orders page rendered with', mockWorkOrders.length, 'work orders');

  const filteredWorkOrders = mockWorkOrders.filter(workOrder => {
    const matchesSearch = workOrder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workOrder.asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workOrder.asset.asset_tag.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || workOrder.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { icon: AlertCircle, color: 'bg-industrial-amber text-black', label: 'Open' };
      case 'IN_PROGRESS':
        return { icon: Clock, color: 'bg-industrial-blue text-white', label: 'In Progress' };
      case 'COMPLETED':
        return { icon: CheckCircle, color: 'bg-industrial-teal text-black', label: 'Completed' };
      case 'CANCELLED':
        return { icon: XCircle, color: 'bg-industrial-gray-600 text-white', label: 'Cancelled' };
      default:
        return { icon: Wrench, color: 'bg-industrial-gray-700 text-white', label: 'Unknown' };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return { color: 'bg-industrial-red text-white', label: 'Critical' };
      case 'HIGH':
        return { color: 'bg-industrial-amber text-black', label: 'High' };
      case 'MEDIUM':
        return { color: 'bg-industrial-blue text-white', label: 'Medium' };
      case 'LOW':
        return { color: 'bg-industrial-gray-600 text-white', label: 'Low' };
      default:
        return { color: 'bg-industrial-gray-700 text-white', label: 'Unknown' };
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'PREVENTIVE':
        return { color: 'border-industrial-teal text-industrial-teal', label: 'Preventive' };
      case 'CORRECTIVE':
        return { color: 'border-industrial-amber text-industrial-amber', label: 'Corrective' };
      case 'EMERGENCY':
        return { color: 'border-industrial-red text-industrial-red', label: 'Emergency' };
      default:
        return { color: 'border-industrial-gray-600 text-industrial-gray-300', label: 'Unknown' };
    }
  };

  const statusCounts = mockWorkOrders.reduce((acc, workOrder) => {
    acc[workOrder.status] = (acc[workOrder.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-industrial-gray-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Work Orders</h1>
          <p className="text-industrial-gray-400 mt-1">
            Manage maintenance tasks and assignments
          </p>
        </div>
        <Button className="bg-industrial-blue hover:bg-industrial-blue/90">
          <Plus className="h-4 w-4 mr-2" />
          Create Work Order
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Total</p>
                <p className="text-2xl font-bold text-white">{mockWorkOrders.length}</p>
              </div>
              <Wrench className="h-8 w-8 text-industrial-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Open</p>
                <p className="text-2xl font-bold text-industrial-amber">{statusCounts.OPEN || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-industrial-amber" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-industrial-blue">{statusCounts.IN_PROGRESS || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-industrial-blue" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Completed</p>
                <p className="text-2xl font-bold text-industrial-teal">{statusCounts.COMPLETED || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-industrial-teal" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-gray-400 h-4 w-4" />
          <Input
            type="search"
            placeholder="Search work orders, assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-industrial-gray-800 border-industrial-gray-600 text-white placeholder:text-industrial-gray-400"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-industrial-gray-400" />
          <div className="flex gap-2">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className={
                  statusFilter === status
                    ? "bg-industrial-blue hover:bg-industrial-blue/90"
                    : "border-industrial-gray-600 text-industrial-gray-300 hover:bg-industrial-gray-800"
                }
              >
                {status === 'ALL' ? `All (${mockWorkOrders.length})` : 
                 status.replace('_', ' ') + ` (${statusCounts[status] || 0})`}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Work Orders List */}
      <div className="space-y-4">
        {filteredWorkOrders.map((workOrder) => {
          const statusConfig = getStatusConfig(workOrder.status);
          const priorityConfig = getPriorityConfig(workOrder.priority);
          const typeConfig = getTypeConfig(workOrder.type);
          const StatusIcon = statusConfig.icon;
          
          return (
            <Card key={workOrder.work_order_id} className="bg-industrial-charcoal border-industrial-gray-700 hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg text-white">{workOrder.title}</CardTitle>
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      <Badge className={priorityConfig.color}>
                        {priorityConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-industrial-gray-400">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>{workOrder.asset.asset_tag}</span>
                      </div>
                      <Badge variant="outline" className={typeConfig.color}>
                        {typeConfig.label}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-industrial-gray-400">Work Order ID</p>
                    <p className="text-sm font-mono text-white">WO-{workOrder.work_order_id.padStart(3, '0')}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Description */}
                <p className="text-sm text-industrial-gray-300">{workOrder.description}</p>
                
                {/* Asset Details */}
                <div className="bg-industrial-gray-800 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-white mb-2">Asset Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-industrial-gray-400">Asset Name</p>
                      <p className="text-white">{workOrder.asset.name}</p>
                    </div>
                    <div>
                      <p className="text-industrial-gray-400">Location</p>
                      <p className="text-white">{workOrder.asset.location.location_name}</p>
                    </div>
                  </div>
                </div>
                
                {/* Assignment and Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-industrial-gray-400" />
                    <div>
                      <p className="text-industrial-gray-400">Assigned to</p>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-industrial-blue text-white text-xs">
                            {workOrder.assigned_to.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white">{workOrder.assigned_to.username}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-industrial-gray-400" />
                    <div>
                      <p className="text-industrial-gray-400">Scheduled</p>
                      <p className="text-white">
                        {workOrder.scheduled_date 
                          ? new Date(workOrder.scheduled_date).toLocaleDateString()
                          : 'Not scheduled'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-industrial-gray-400" />
                    <div>
                      <p className="text-industrial-gray-400">Created</p>
                      <p className="text-white">
                        {new Date(workOrder.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
                    Edit
                  </Button>
                  {workOrder.status === 'OPEN' && (
                    <Button size="sm" className="bg-industrial-blue hover:bg-industrial-blue/90">
                      Start Work
                    </Button>
                  )}
                  {workOrder.status === 'IN_PROGRESS' && (
                    <Button size="sm" className="bg-industrial-teal hover:bg-industrial-teal/90">
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredWorkOrders.length === 0 && (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-industrial-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No work orders found</h3>
          <p className="text-industrial-gray-400">
            Try adjusting your search criteria or filters
          </p>
        </div>
      )}
    </div>
  );
}