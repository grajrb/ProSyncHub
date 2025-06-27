// API integration for frontend
import axios from 'axios';

// Import types
import { User, Role } from '../types';

// Define interfaces locally since they're not available in types
interface GetUserActivityParams {
  limit?: number;
  page?: number;
  startDate?: string;
  endDate?: string;
  action?: string;
}

interface UserActivity {
  id: string;
  userId: string;
  action: string;
  timestamp: Date;
  details?: any;
}

// Create axios instance with base URL and default headers
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 (Unauthorized) and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const refreshResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`,
            { refreshToken }
          );
          
          const { token, refreshToken: newRefreshToken } = refreshResponse.data;
          
          // Update tokens in localStorage
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          // Update authorization header
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          
          // Retry original request
          return axios(originalRequest);
        }
      } catch (refreshError) {
        // If refresh failed, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Redirect to login page if in browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
const apiEndpoints = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) => api.post<{ token: string; refreshToken: string; user: any }>('/auth/login', credentials),
    register: (userData: { name: string; email: string; password: string }) => api.post<{ token: string; refreshToken: string; user: any }>('/auth/register', userData),
    refreshToken: (refreshToken: string) => api.post<{ token: string; refreshToken: string }>('/auth/refresh-token', { refreshToken }),
    logout: () => api.post<void>('/auth/logout'),
    forgotPassword: (email: string) => api.post<void>('/auth/forgot-password', { email }),
    resetPassword: (token: string, password: string) => api.post<void>('/auth/reset-password', { token, password }),
  },
  // Users
  users: {
    getAll: (params: { [key: string]: any }) => api.get<User[]>('/users', { params }),
    getById: (id: string) => api.get<User>(`/users/${id}`),
    create: (userData: { name: string; email: string; password: string }) => api.post<User>('/users', userData),
    update: (id: string, userData: { name?: string; email?: string; password?: string }) => api.put<User>(`/users/${id}`, userData),
    delete: (id: string) => api.delete<void>(`/users/${id}`),
    changePassword: (id: string, password: string) => api.put<void>(`/users/${id}/password`, { password }),
    getActivity: (id: string, params: GetUserActivityParams) => api.get<UserActivity[]>(`/users/${id}/activity`, { params }),
    getRoles: () => api.get<Role[]>('/users/roles'),
  },
  // Assets
  assets: {
    getAll: (params: { [key: string]: any }) => api.get<any[]>('/assets', { params }),
    getById: (id: string) => api.get<any>(`/assets/${id}`),
    create: (assetData: any) => api.post<any>('/assets', assetData),
    update: (id: string, assetData: any) => api.put<any>(`/assets/${id}`, assetData),
    delete: (id: string) => api.delete<void>(`/assets/${id}`),
    getSensorReadings: (id: string, params: { [key: string]: any }) => api.get<any[]>(`/assets/${id}/sensor-readings`, { params }),
    getEvents: (id: string, params: { [key: string]: any }) => api.get<any[]>(`/assets/${id}/events`, { params }),
    getWorkOrders: (id: string, params: { [key: string]: any }) => api.get<any[]>(`/assets/${id}/work-orders`, { params }),
  },
  // Work Orders
  workOrders: {
    getAll: (params: { [key: string]: any }) => api.get<any[]>('/work-orders', { params }),
    getById: (id: string) => api.get<any>(`/work-orders/${id}`),
    create: (workOrderData: any) => api.post<any>('/work-orders', workOrderData),
    update: (id: string, workOrderData: any) => api.put<any>(`/work-orders/${id}`, workOrderData),
    delete: (id: string) => api.delete<void>(`/work-orders/${id}`),
    updateStatus: (id: string, status: any, notes: any) => api.put<void>(`/work-orders/${id}/status`, { status, notes }),
    assign: (id: string, assignedToId: string) => api.put<void>(`/work-orders/${id}/assign`, { assigned_to_id: assignedToId }),
    updateChecklist: (id: string, checklistItems: any[]) => api.put<void>(`/work-orders/${id}/checklist`, { checklist_items: checklistItems }),
  },
  // Analytics
  analytics: {
    getAssetStatusSummary: (params: { [key: string]: any }) => api.get<any>('/analytics/asset-status-summary', { params }),
    getWorkOrderStatusSummary: (params: { [key: string]: any }) => api.get<any>('/analytics/work-order-status-summary', { params }),
    getAssetHealthOverview: (params: { [key: string]: any }) => api.get<any>('/analytics/asset-health-overview', { params }),
    getWorkOrderStatistics: (params: { [key: string]: any }) => api.get<any>('/analytics/work-order-statistics', { params }),
    getAssetPerformanceMetrics: (params: { [key: string]: any }) => api.get<any>('/analytics/asset-performance-metrics', { params }),
    getMaintenanceCostAnalysis: (params: { [key: string]: any }) => api.get<any>('/analytics/maintenance-cost-analysis', { params }),
    getPredictiveInsights: (params: { [key: string]: any }) => api.get<any>('/analytics/predictive-insights', { params }),
  },
  // Predictive Maintenance
  predictive: {
    analyzeAssetHealth: (id: string) => api.get<any>(`/predictive/assets/${id}/analyze`),
    runPredictiveScan: (params: { [key: string]: any }) => api.post<any>('/predictive/scan', null, { params }),
    generateMaintenanceWorkOrders: (data: any) => api.post<any[]>('/predictive/work-orders/generate', data),
  },
  // Notifications
  notifications: {
    getUserNotifications: (userId: string, params: { [key: string]: any }) => api.get<any[]>(`/notifications/users/${userId}`, { params }),
    markAsRead: (id: string) => api.put<void>(`/notifications/${id}/read`),
    markAllAsRead: (userId: string) => api.put<void>(`/notifications/users/${userId}/read-all`),
    create: (notificationData: any) => api.post<any>('/notifications', notificationData),
    createBulk: (bulkData: any[]) => api.post<any[]>('/notifications/bulk', bulkData),
    delete: (id: string) => api.delete<void>(`/notifications/${id}`),
  },
};

export default apiEndpoints;
