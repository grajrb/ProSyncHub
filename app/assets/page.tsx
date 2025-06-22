'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Plus, 
  Download,
  Package,
  MapPin,
  Calendar,
  Zap,
  AlertTriangle,
  Wrench,
  XCircle
} from 'lucide-react';
import { mockAssets } from '../lib/mock-data';
import { Asset } from '../types';

export default function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  console.log('Assets page rendered with', mockAssets.length, 'assets');

  const filteredAssets = mockAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.asset_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || asset.current_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return { icon: Zap, color: 'bg-industrial-teal text-black', label: 'Online' };
      case 'WARNING':
        return { icon: AlertTriangle, color: 'bg-industrial-amber text-black', label: 'Warning' };
      case 'ERROR':
        return { icon: XCircle, color: 'bg-industrial-red text-white', label: 'Error' };
      case 'MAINTENANCE':
        return { icon: Wrench, color: 'bg-industrial-amber text-black', label: 'Maintenance' };
      case 'OFFLINE':
        return { icon: XCircle, color: 'bg-industrial-gray-600 text-white', label: 'Offline' };
      default:
        return { icon: Package, color: 'bg-industrial-gray-700 text-white', label: 'Unknown' };
    }
  };

  const statusCounts = mockAssets.reduce((acc, asset) => {
    acc[asset.current_status] = (acc[asset.current_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-industrial-gray-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Asset Registry</h1>
          <p className="text-industrial-gray-400 mt-1">
            Manage and monitor your industrial assets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="bg-industrial-blue hover:bg-industrial-blue/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-industrial-gray-400 h-4 w-4" />
          <Input
            type="search"
            placeholder="Search assets, tags, manufacturers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-industrial-gray-800 border-industrial-gray-600 text-white placeholder:text-industrial-gray-400"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-industrial-gray-400" />
          <div className="flex gap-2">
            {['ALL', 'ONLINE', 'WARNING', 'ERROR', 'MAINTENANCE', 'OFFLINE'].map((status) => (
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
                {status === 'ALL' ? `All (${mockAssets.length})` : `${status} (${statusCounts[status] || 0})`}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map((asset) => {
          const statusConfig = getStatusConfig(asset.current_status);
          const StatusIcon = statusConfig.icon;
          
          return (
            <Card key={asset.asset_id} className="bg-industrial-charcoal border-industrial-gray-700 hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-white">{asset.name}</CardTitle>
                    <Badge variant="outline" className="text-xs font-mono bg-industrial-gray-800 text-industrial-gray-300 border-industrial-gray-600">
                      {asset.asset_tag}
                    </Badge>
                  </div>
                  <Badge className={statusConfig.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Asset Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-industrial-gray-400">Manufacturer</p>
                    <p className="text-white font-medium">{asset.manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-industrial-gray-400">Model</p>
                    <p className="text-white font-medium">{asset.model}</p>
                  </div>
                </div>

                {/* Location and Type */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-industrial-gray-400" />
                    <span className="text-industrial-gray-400">Location:</span>
                    <span className="text-white">{asset.location.location_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-industrial-gray-400" />
                    <span className="text-industrial-gray-400">Type:</span>
                    <span className="text-white">{asset.asset_type.type_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-industrial-gray-400" />
                    <span className="text-industrial-gray-400">Installed:</span>
                    <span className="text-white">
                      {new Date(asset.installation_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Health Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-industrial-gray-400">Health Score</span>
                    <span className={`font-bold ${
                      asset.health_score >= 80 ? 'text-industrial-teal' :
                      asset.health_score >= 60 ? 'text-industrial-amber' :
                      'text-industrial-red'
                    }`}>
                      {asset.health_score}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-industrial-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        asset.health_score >= 80 ? 'bg-industrial-teal' :
                        asset.health_score >= 60 ? 'bg-industrial-amber' :
                        'bg-industrial-red'
                      }`}
                      style={{ width: `${asset.health_score}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
                    <Wrench className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-industrial-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No assets found</h3>
          <p className="text-industrial-gray-400">
            Try adjusting your search criteria or filters
          </p>
        </div>
      )}
    </div>
  );
}