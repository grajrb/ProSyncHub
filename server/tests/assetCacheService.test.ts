import mongoose from 'mongoose';
import { connectToMongoDB, disconnectFromMongoDB } from '../mongodb';
import { redisClient } from '../redisClient';
import { assetCacheService } from '../services/assetCacheService';
import { getCache, setCache, deleteCache } from '../redis';
import AssetSensorData from '../models/AssetSensorData';

describe('Asset Cache Service', () => {
  beforeAll(async () => {
    // Connect to MongoDB and Redis
    await connectToMongoDB();
    await redisClient.connect();
  });
  
  afterAll(async () => {
    // Disconnect from MongoDB and Redis
    await disconnectFromMongoDB();
    await redisClient.quit();
  });
  
  beforeEach(async () => {
    // Clear Redis cache before each test
    await redisClient.flushDb();
  });
  
  // Mock asset and related data
  const mockAssetId = 'test-asset-123';
  const mockAsset = {
    id: mockAssetId,
    name: 'Test Asset',
    type: 'equipment',
    status: 'operational'
  };
  
  const mockSensorData = [
    {
      assetId: mockAssetId,
      sensorId: 'sensor-1',
      value: 25.5,
      unit: '°C'
    },
    {
      assetId: mockAssetId,
      sensorId: 'sensor-2',
      value: 75,
      unit: '%'
    }
  ];
  
  const mockWorkOrders = [
    {
      id: 'wo-1',
      assetId: mockAssetId,
      title: 'Test Work Order 1',
      status: 'pending'
    }
  ];
  
  const mockChecklists = [
    {
      id: 'cl-1',
      assetId: mockAssetId,
      title: 'Test Checklist',
      items: [{ title: 'Item 1', isCompleted: false }]
    }
  ];
  
  const mockEvents = [
    {
      id: 'ev-1',
      assetId: mockAssetId,
      eventType: 'system',
      message: 'Test Event'
    }
  ];
  
  test('should cache and retrieve an asset', async () => {
    // Cache the asset
    await assetCacheService.cacheAsset(mockAssetId, mockAsset);
    
    // Get the cached asset
    const cachedAsset = await assetCacheService.getCachedAsset(mockAssetId);
    
    expect(cachedAsset).toEqual(mockAsset);
  });
  
  test('should cache and retrieve sensor data', async () => {
    // Cache sensor data
    await assetCacheService.cacheAssetSensors(mockAssetId, mockSensorData);
    
    // Get cached sensor data
    const cachedSensorData = await assetCacheService.getCachedAssetSensors(mockAssetId);
    
    expect(cachedSensorData).toEqual(mockSensorData);
  });
  
  test('should cache and retrieve work orders', async () => {
    // Cache work orders
    await assetCacheService.cacheAssetWorkOrders(mockAssetId, mockWorkOrders);
    
    // Get cached work orders
    const cachedWorkOrders = await assetCacheService.getCachedAssetWorkOrders(mockAssetId);
    
    expect(cachedWorkOrders).toEqual(mockWorkOrders);
  });
  
  test('should cache and retrieve checklists', async () => {
    // Cache checklists
    await assetCacheService.cacheAssetChecklists(mockAssetId, mockChecklists);
    
    // Get cached checklists
    const cachedChecklists = await assetCacheService.getCachedAssetChecklists(mockAssetId);
    
    expect(cachedChecklists).toEqual(mockChecklists);
  });
  
  test('should cache and retrieve events', async () => {
    // Cache events
    await assetCacheService.cacheAssetEvents(mockAssetId, mockEvents);
    
    // Get cached events
    const cachedEvents = await assetCacheService.getCachedAssetEvents(mockAssetId);
    
    expect(cachedEvents).toEqual(mockEvents);
  });
  
  test('should invalidate asset cache', async () => {
    // Cache the asset
    await assetCacheService.cacheAsset(mockAssetId, mockAsset);
    
    // Verify it's cached
    const cachedAsset = await assetCacheService.getCachedAsset(mockAssetId);
    expect(cachedAsset).toEqual(mockAsset);
    
    // Invalidate the cache
    await assetCacheService.invalidateAssetCache(mockAssetId);
    
    // Verify it's no longer cached
    const invalidatedCache = await assetCacheService.getCachedAsset(mockAssetId);
    expect(invalidatedCache).toBeNull();
  });
  
  test('should invalidate sensor data cache', async () => {
    // Cache sensor data
    await assetCacheService.cacheAssetSensors(mockAssetId, mockSensorData);
    
    // Verify it's cached
    const cachedSensorData = await assetCacheService.getCachedAssetSensors(mockAssetId);
    expect(cachedSensorData).toEqual(mockSensorData);
    
    // Invalidate the cache
    await assetCacheService.invalidateAssetSensorsCache(mockAssetId);
    
    // Verify it's no longer cached
    const invalidatedCache = await assetCacheService.getCachedAssetSensors(mockAssetId);
    expect(invalidatedCache).toBeNull();
  });
  
  test('should clear all caches related to an asset', async () => {
    // Cache all asset-related data
    await assetCacheService.cacheAsset(mockAssetId, mockAsset);
    await assetCacheService.cacheAssetSensors(mockAssetId, mockSensorData);
    await assetCacheService.cacheAssetWorkOrders(mockAssetId, mockWorkOrders);
    await assetCacheService.cacheAssetChecklists(mockAssetId, mockChecklists);
    await assetCacheService.cacheAssetEvents(mockAssetId, mockEvents);
    
    // Verify all data is cached
    expect(await assetCacheService.getCachedAsset(mockAssetId)).not.toBeNull();
    expect(await assetCacheService.getCachedAssetSensors(mockAssetId)).not.toBeNull();
    expect(await assetCacheService.getCachedAssetWorkOrders(mockAssetId)).not.toBeNull();
    expect(await assetCacheService.getCachedAssetChecklists(mockAssetId)).not.toBeNull();
    expect(await assetCacheService.getCachedAssetEvents(mockAssetId)).not.toBeNull();
    
    // Clear all caches for the asset
    await assetCacheService.clearAssetCaches(mockAssetId);
    
    // Verify all caches are cleared
    expect(await assetCacheService.getCachedAsset(mockAssetId)).toBeNull();
    expect(await assetCacheService.getCachedAssetSensors(mockAssetId)).toBeNull();
    expect(await assetCacheService.getCachedAssetWorkOrders(mockAssetId)).toBeNull();
    expect(await assetCacheService.getCachedAssetChecklists(mockAssetId)).toBeNull();
    expect(await assetCacheService.getCachedAssetEvents(mockAssetId)).toBeNull();
  });
  
  test('should clear all asset caches', async () => {
    // Cache multiple assets
    const mockAssetId2 = 'test-asset-456';
    
    await assetCacheService.cacheAsset(mockAssetId, mockAsset);
    await assetCacheService.cacheAsset(mockAssetId2, { ...mockAsset, id: mockAssetId2 });
    
    // Verify assets are cached
    expect(await assetCacheService.getCachedAsset(mockAssetId)).not.toBeNull();
    expect(await assetCacheService.getCachedAsset(mockAssetId2)).not.toBeNull();
    
    // Clear all asset caches
    await assetCacheService.clearAllAssetCaches();
    
    // Verify all asset caches are cleared
    expect(await assetCacheService.getCachedAsset(mockAssetId)).toBeNull();
    expect(await assetCacheService.getCachedAsset(mockAssetId2)).toBeNull();
  });
  
  test('should automatically invalidate cache when TTL expires', async () => {
    // Use a short TTL (1 second) for this test
    const shortTtl = 1;
    
    // Directly use Redis setCache with short TTL
    await setCache(`asset:${mockAssetId}`, mockAsset, shortTtl);
    
    // Verify it's cached
    let cachedData = await getCache(`asset:${mockAssetId}`);
    expect(cachedData).toEqual(mockAsset);
    
    // Wait for the TTL to expire (a bit more than 1 second)
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Verify cache is expired
    cachedData = await getCache(`asset:${mockAssetId}`);
    expect(cachedData).toBeNull();
  });
});
