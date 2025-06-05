import { setCache, getCache, deleteCache, clearCache, publishMessage, subscribeToChannel } from '../redis';

// Cache key prefixes
const ASSET_PREFIX = 'asset:';
const ASSETS_LIST_KEY = 'assets:list';
const ASSET_SENSORS_PREFIX = 'asset:sensors:';
const ASSET_WORKORDERS_PREFIX = 'asset:workorders:';
const ASSET_CHECKLIST_PREFIX = 'asset:checklists:';
const ASSET_EVENTS_PREFIX = 'asset:events:';

// Cache durations in seconds
const CACHE_DURATIONS = {
  ASSET: 3600, // 1 hour
  ASSETS_LIST: 1800, // 30 minutes
  ASSET_SENSORS: 300, // 5 minutes
  ASSET_WORKORDERS: 900, // 15 minutes
  ASSET_CHECKLISTS: 900, // 15 minutes
  ASSET_EVENTS: 600, // 10 minutes
};

export const assetCacheService = {
  // Cache an individual asset
  async cacheAsset(assetId: string, assetData: any): Promise<void> {
    await setCache(`${ASSET_PREFIX}${assetId}`, assetData, CACHE_DURATIONS.ASSET);
  },
  
  // Get a cached asset
  async getCachedAsset<T = any>(assetId: string): Promise<T | null> {
    return getCache<T>(`${ASSET_PREFIX}${assetId}`);
  },
  
  // Invalidate a cached asset
  async invalidateAssetCache(assetId: string): Promise<boolean> {
    return deleteCache(`${ASSET_PREFIX}${assetId}`);
  },
  
  // Cache a list of assets
  async cacheAssetsList(assets: any[], filterKey?: string): Promise<void> {
    const key = filterKey ? `${ASSETS_LIST_KEY}:${filterKey}` : ASSETS_LIST_KEY;
    await setCache(key, assets, CACHE_DURATIONS.ASSETS_LIST);
  },
  
  // Get cached assets list
  async getCachedAssetsList<T = any[]>(filterKey?: string): Promise<T | null> {
    const key = filterKey ? `${ASSETS_LIST_KEY}:${filterKey}` : ASSETS_LIST_KEY;
    return getCache<T>(key);
  },
  
  // Invalidate all cached asset lists
  async invalidateAssetsListCache(): Promise<number> {
    return clearCache(ASSETS_LIST_KEY);
  },
  
  // Cache sensor data for an asset
  async cacheAssetSensors(assetId: string, sensorData: any): Promise<void> {
    await setCache(`${ASSET_SENSORS_PREFIX}${assetId}`, sensorData, CACHE_DURATIONS.ASSET_SENSORS);
  },
  
  // Get cached sensor data for an asset
  async getCachedAssetSensors<T = any>(assetId: string): Promise<T | null> {
    return getCache<T>(`${ASSET_SENSORS_PREFIX}${assetId}`);
  },
  
  // Invalidate cached sensor data for an asset
  async invalidateAssetSensorsCache(assetId: string): Promise<boolean> {
    return deleteCache(`${ASSET_SENSORS_PREFIX}${assetId}`);
  },
  
  // Cache work orders for an asset
  async cacheAssetWorkOrders(assetId: string, workOrders: any): Promise<void> {
    await setCache(`${ASSET_WORKORDERS_PREFIX}${assetId}`, workOrders, CACHE_DURATIONS.ASSET_WORKORDERS);
  },
  
  // Get cached work orders for an asset
  async getCachedAssetWorkOrders<T = any>(assetId: string): Promise<T | null> {
    return getCache<T>(`${ASSET_WORKORDERS_PREFIX}${assetId}`);
  },
  
  // Invalidate cached work orders for an asset
  async invalidateAssetWorkOrdersCache(assetId: string): Promise<boolean> {
    return deleteCache(`${ASSET_WORKORDERS_PREFIX}${assetId}`);
  },
  
  // Cache checklists for an asset
  async cacheAssetChecklists(assetId: string, checklists: any): Promise<void> {
    await setCache(`${ASSET_CHECKLIST_PREFIX}${assetId}`, checklists, CACHE_DURATIONS.ASSET_CHECKLISTS);
  },
  
  // Get cached checklists for an asset
  async getCachedAssetChecklists<T = any>(assetId: string): Promise<T | null> {
    return getCache<T>(`${ASSET_CHECKLIST_PREFIX}${assetId}`);
  },
  
  // Invalidate cached checklists for an asset
  async invalidateAssetChecklistsCache(assetId: string): Promise<boolean> {
    return deleteCache(`${ASSET_CHECKLIST_PREFIX}${assetId}`);
  },
  
  // Cache events for an asset
  async cacheAssetEvents(assetId: string, events: any): Promise<void> {
    await setCache(`${ASSET_EVENTS_PREFIX}${assetId}`, events, CACHE_DURATIONS.ASSET_EVENTS);
  },
  
  // Get cached events for an asset
  async getCachedAssetEvents<T = any>(assetId: string): Promise<T | null> {
    return getCache<T>(`${ASSET_EVENTS_PREFIX}${assetId}`);
  },
  
  // Invalidate cached events for an asset
  async invalidateAssetEventsCache(assetId: string): Promise<boolean> {
    return deleteCache(`${ASSET_EVENTS_PREFIX}${assetId}`);
  },
  
  // Clear all caches related to a specific asset
  async clearAssetCaches(assetId: string): Promise<void> {
    await Promise.all([
      deleteCache(`${ASSET_PREFIX}${assetId}`),
      deleteCache(`${ASSET_SENSORS_PREFIX}${assetId}`),
      deleteCache(`${ASSET_WORKORDERS_PREFIX}${assetId}`),
      deleteCache(`${ASSET_CHECKLIST_PREFIX}${assetId}`),
      deleteCache(`${ASSET_EVENTS_PREFIX}${assetId}`),
      clearCache(ASSETS_LIST_KEY),
    ]);
  },
  
  // Clear all asset-related caches
  async clearAllAssetCaches(): Promise<void> {
    await Promise.all([
      clearCache(ASSET_PREFIX),
      clearCache(ASSETS_LIST_KEY),
      clearCache(ASSET_SENSORS_PREFIX),
      clearCache(ASSET_WORKORDERS_PREFIX),
      clearCache(ASSET_CHECKLIST_PREFIX),
      clearCache(ASSET_EVENTS_PREFIX),
    ]);
  }
};

export default assetCacheService;