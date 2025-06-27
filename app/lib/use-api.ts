'use client';

import { useState, useEffect } from 'react';
import apiEndpoints from './api';

export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

// Base hook for API calls
export function useApi<T>(
  apiCall: (...args: any[]) => Promise<any>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
    dependencies?: any[];
    autoFetch?: boolean;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const [status, setStatus] = useState<ApiStatus>('idle');
  const { onSuccess, onError, dependencies = [], autoFetch = false } = options;

  // Define the fetch function
  const fetchData = async (...args: any[]) => {
    try {
      setStatus('loading');
      const response = await apiCall(...args);
      const result = response.data;
      setData(result);
      setStatus('success');
      onSuccess?.(result);
      return result;
    } catch (err) {
      setError(err);
      setStatus('error');
      onError?.(err);
      throw err;
    }
  };

  // Auto fetch if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return {
    data,
    error,
    status,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    fetchData
  };
}

// Specialized hooks for common operations

// Auth hooks
export function useLogin() {
  return useApi(apiEndpoints.auth.login);
}

export function useRegister() {
  return useApi(apiEndpoints.auth.register);
}

// Asset hooks
export function useAssets(options = {}) {
  return useApi(apiEndpoints.assets.getAll, { ...options, autoFetch: true });
}

export function useAsset(id: string, options = {}) {
  return useApi(apiEndpoints.assets.getById, {
    ...options,
    dependencies: [id],
    autoFetch: true
  });
}

export function useAssetSensorReadings(assetId: string, options = {}) {
  return useApi((params) => apiEndpoints.assets.getSensorReadings(assetId, params), {
    ...options,
    dependencies: [assetId],
    autoFetch: true
  });
}

export function useAssetEvents(assetId: string, options = {}) {
  return useApi((params) => apiEndpoints.assets.getEvents(assetId, params), {
    ...options,
    dependencies: [assetId],
    autoFetch: true
  });
}

// Work order hooks
export function useWorkOrders(options = {}) {
  return useApi(apiEndpoints.workOrders.getAll, { ...options, autoFetch: true });
}

export function useWorkOrder(id: string, options = {}) {
  return useApi(apiEndpoints.workOrders.getById, {
    ...options,
    dependencies: [id],
    autoFetch: true
  });
}

// Analytics hooks
export function useAssetStatusSummary(options = {}) {
  return useApi(apiEndpoints.analytics.getAssetStatusSummary, { ...options, autoFetch: true });
}

export function useWorkOrderStatusSummary(options = {}) {
  return useApi(apiEndpoints.analytics.getWorkOrderStatusSummary, { ...options, autoFetch: true });
}

export function useAssetHealthOverview(options = {}) {
  return useApi(apiEndpoints.analytics.getAssetHealthOverview, { ...options, autoFetch: true });
}

// User hooks
export function useUsers(options = {}) {
  return useApi(apiEndpoints.users.getAll, { ...options, autoFetch: true });
}

export function useUser(id: string, options = {}) {
  return useApi(apiEndpoints.users.getById, {
    ...options,
    dependencies: [id],
    autoFetch: true
  });
}

// Notification hooks
export function useUserNotifications(userId: string, options = {}) {
  return useApi((params) => apiEndpoints.notifications.getUserNotifications(userId, params), {
    ...options,
    dependencies: [userId],
    autoFetch: true
  });
}

// Predictive maintenance hooks
export function useAssetHealthAnalysis(assetId: string, options = {}) {
  return useApi(() => apiEndpoints.predictive.analyzeAssetHealth(assetId), {
    ...options,
    dependencies: [assetId],
    autoFetch: true
  });
}
