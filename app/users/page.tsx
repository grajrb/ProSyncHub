'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Plus,
  User,
  Shield,
  Mail,
  Calendar,
  Settings,
  Edit,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react';

// Mock user data
const mockUsers = [
  {
    user_id: '1',
    username: 'supervisor',
    email: 'supervisor@prosync.com',
    role: { role_name: 'Supervisor', color: 'bg-industrial-blue' },
    status: 'ACTIVE',
    last_login: '2024-12-22T14:30:00Z',
    created_at: '2023-01-01T00:00:00Z'
  },
  {
    user_id: '2',
    username: 'john.tech',
    email: 'john.tech@prosync.com',
    role: { role_name: 'Technician', color: 'bg-industrial-teal' },
    status: 'ACTIVE',
    last_login: '2024-12-22T13:45:00Z',
    created_at: '2023-02-15T00:00:00Z'
  },
  {
    user_id: '3',
    username: 'maintenance.crew',
    email: 'maintenance@prosync.com',
    role: { role_name: 'Technician', color: 'bg-industrial-teal' },
    status: 'ACTIVE',
    last_login: '2024-12-22T12:20:00Z',
    created_at: '2023-03-10T00:00:00Z'
  },
  {
    user_id: '4',
    username: 'admin',
    email: 'admin@prosync.com',
    role: { role_name: 'Administrator', color: 'bg-industrial-red' },
    status: 'ACTIVE',
    last_login: '2024-12-22T09:15:00Z',
    created_at: '2023-01-01T00:00:00Z'
  },
  {
    user_id: '5',
    username: 'operator.smith',
    email: 'smith@prosync.com',
    role: { role_name: 'Operator', color: 'bg-industrial-amber' },
    status: 'INACTIVE',
    last_login: '2024-12-20T16:30:00Z',
    created_at: '2023-06-01T00:00:00Z'
  }
];

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  console.log('Users page rendered with', mockUsers.length, 'users');

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.role.role_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || user.role.role_name === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { color: 'bg-industrial-teal text-black', icon: UserCheck, label: 'Active' };
      case 'INACTIVE':
        return { color: 'bg-industrial-gray-600 text-white', icon: UserX, label: 'Inactive' };
      case 'SUSPENDED':
        return { color: 'bg-industrial-red text-white', icon: UserX, label: 'Suspended' };
      default:
        return { color: 'bg-industrial-gray-700 text-white', icon: User, label: 'Unknown' };
    }
  };

  const roleStats = mockUsers.reduce((acc, user) => {
    acc[user.role.role_name] = (acc[user.role.role_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusStats = mockUsers.reduce((acc, user) => {
    acc[user.status] = (acc[user.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-industrial-gray-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-industrial-gray-400 mt-1">
            Manage users, roles, and access permissions
          </p>
        </div>
        <Button className="bg-industrial-blue hover:bg-industrial-blue/90">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-white">{mockUsers.length}</p>
              </div>
              <User className="h-8 w-8 text-industrial-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-industrial-teal">{statusStats.ACTIVE || 0}</p>
              </div>
              <UserCheck className="h-8 w-8 text-industrial-teal" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Administrators</p>
                <p className="text-2xl font-bold text-industrial-red">{roleStats.Administrator || 0}</p>
              </div>
              <Shield className="h-8 w-8 text-industrial-red" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-industrial-charcoal border-industrial-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-industrial-gray-400">Technicians</p>
                <p className="text-2xl font-bold text-industrial-teal">{roleStats.Technician || 0}</p>
              </div>
              <Settings className="h-8 w-8 text-industrial-teal" />
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
            placeholder="Search users, emails, roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-industrial-gray-800 border-industrial-gray-600 text-white placeholder:text-industrial-gray-400"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-industrial-gray-400" />
          <div className="flex gap-2">
            {['ALL', 'Administrator', 'Supervisor', 'Technician', 'Operator'].map((role) => (
              <Button
                key={role}
                variant={roleFilter === role ? "default" : "outline"}
                size="sm"
                onClick={() => setRoleFilter(role)}
                className={
                  roleFilter === role
                    ? "bg-industrial-blue hover:bg-industrial-blue/90"
                    : "border-industrial-gray-600 text-industrial-gray-300 hover:bg-industrial-gray-800"
                }
              >
                {role === 'ALL' ? `All Roles (${mockUsers.length})` : `${role} (${roleStats[role] || 0})`}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
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
              {status === 'ALL' ? 'All Status' : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Users Table/Grid */}
      <div className="space-y-4">
        {filteredUsers.map((user) => {
          const statusConfig = getStatusConfig(user.status);
          const StatusIcon = statusConfig.icon;
          
          return (
            <Card key={user.user_id} className="bg-industrial-charcoal border-industrial-gray-700 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={`${user.role.color} text-white text-lg font-bold`}>
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{user.username}</h3>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <Badge className={`${user.role.color} text-white`}>
                          {user.role.role_name}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-industrial-gray-400" />
                          <span className="text-industrial-gray-300">{user.email}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-industrial-gray-400" />
                          <span className="text-industrial-gray-300">
                            Last login: {new Date(user.last_login).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-industrial-gray-400" />
                          <span className="text-industrial-gray-300">
                            Created: {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="border-industrial-gray-600 text-white hover:bg-industrial-gray-800">
                      <Shield className="h-4 w-4 mr-2" />
                      Permissions
                    </Button>
                    {user.status === 'ACTIVE' ? (
                      <Button size="sm" variant="outline" className="border-industrial-amber text-industrial-amber hover:bg-industrial-amber/10">
                        <UserX className="h-4 w-4 mr-2" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="border-industrial-teal text-industrial-teal hover:bg-industrial-teal/10">
                        <UserCheck className="h-4 w-4 mr-2" />
                        Activate
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="border-industrial-red text-industrial-red hover:bg-industrial-red/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-industrial-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No users found</h3>
          <p className="text-industrial-gray-400">
            Try adjusting your search criteria or filters
          </p>
        </div>
      )}

      {/* Role Distribution Summary */}
      <Card className="bg-industrial-charcoal border-industrial-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Role Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(roleStats).map(([role, count]) => (
              <div key={role} className="text-center">
                <div className="h-12 w-12 rounded-full bg-industrial-blue/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold text-industrial-blue">{count}</span>
                </div>
                <p className="text-sm text-industrial-gray-400">{role}</p>
                <p className="text-xs text-industrial-blue">{((count / mockUsers.length) * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}