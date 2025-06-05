import { performanceMonitor } from '../services/performanceMonitorService';

describe('Performance Monitor Service', () => {
  beforeEach(() => {
    // Enable monitoring for tests
    performanceMonitor.updateOptions({
      enabled: true,
      sampleRate: 1.0, // Monitor all operations during tests
      retentionPeriod: 3600000,
      logSlowOperations: false
    });
  });
  
  test('should record MongoDB operations', async () => {
    // Simulate a MongoDB operation
    await performanceMonitor.monitorMongoOperation('findDocuments', async () => {
      // Simulate a query taking 50ms
      await new Promise(resolve => setTimeout(resolve, 50));
      return [{ id: 1, name: 'Test' }];
    }, { collection: 'users', query: { name: 'Test' } });
    
    // Get stats for the operation
    const stats = performanceMonitor.getOperationStats('mongodb', 'findDocuments');
    
    // Verify stats
    expect(stats.count).toBe(1);
    expect(stats.avgDuration).toBeGreaterThanOrEqual(50);
    expect(stats.successCount).toBe(1);
    expect(stats.failureCount).toBe(0);
    expect(stats.successRate).toBe(1);
  });
  
  test('should record Redis operations', async () => {
    // Simulate a Redis operation
    await performanceMonitor.monitorRedisOperation('getCache', async () => {
      // Simulate a cache lookup taking 20ms
      await new Promise(resolve => setTimeout(resolve, 20));
      return { cached: true, value: 'test-data' };
    }, { key: 'test-key' });
    
    // Get stats for the operation
    const stats = performanceMonitor.getOperationStats('redis', 'getCache');
    
    // Verify stats
    expect(stats.count).toBe(1);
    expect(stats.avgDuration).toBeGreaterThanOrEqual(20);
    expect(stats.successCount).toBe(1);
  });
  
  test('should record operation failures', async () => {
    // Simulate a failed operation
    try {
      await performanceMonitor.monitorMongoOperation('updateDocument', async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        throw new Error('Test error');
      });
    } catch (error) {
      // Expected error
    }
    
    // Get stats for the operation
    const stats = performanceMonitor.getOperationStats('mongodb', 'updateDocument');
    
    // Verify stats
    expect(stats.count).toBe(1);
    expect(stats.successCount).toBe(0);
    expect(stats.failureCount).toBe(1);
    expect(stats.successRate).toBe(0);
  });
  
  test('should calculate aggregated statistics', async () => {
    // Record multiple operations
    for (let i = 0; i < 5; i++) {
      await performanceMonitor.monitorRedisOperation('setCache', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return true;
      });
    }
    
    // Simulate some failures
    for (let i = 0; i < 2; i++) {
      try {
        await performanceMonitor.monitorRedisOperation('setCache', async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected error
      }
    }
    
    // Get stats for the operation
    const stats = performanceMonitor.getOperationStats('redis', 'setCache');
    
    // Verify stats
    expect(stats.count).toBe(7); // 5 success + 2 failures
    expect(stats.successCount).toBe(5);
    expect(stats.failureCount).toBe(2);
    expect(stats.successRate).toBeCloseTo(5/7);
  });
  
  test('should get all operation statistics', async () => {
    // Record operations for different services and operation types
    await performanceMonitor.monitorMongoOperation('find', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return [{ id: 1 }];
    });
    
    await performanceMonitor.monitorMongoOperation('update', async () => {
      await new Promise(resolve => setTimeout(resolve, 15));
      return { modifiedCount: 1 };
    });
    
    await performanceMonitor.monitorRedisOperation('get', async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return 'value';
    });
    
    // Get all stats
    const allStats = performanceMonitor.getAllStats();
    
    // Verify structure
    expect(allStats).toHaveProperty('mongodb');
    expect(allStats).toHaveProperty('redis');
    expect(allStats.mongodb).toHaveProperty('find');
    expect(allStats.mongodb).toHaveProperty('update');
    expect(allStats.redis).toHaveProperty('get');
    
    // Verify counts
    expect(allStats.mongodb.find.count).toBe(1);
    expect(allStats.mongodb.update.count).toBe(1);
    expect(allStats.redis.get.count).toBe(1);
  });
  
  test('should respect sample rate setting', async () => {
    // Set a low sample rate
    performanceMonitor.updateOptions({ sampleRate: 0.1 });
    
    // Run 100 operations
    for (let i = 0; i < 100; i++) {
      await performanceMonitor.monitorMongoOperation('bulkTest', async () => {
        return true;
      });
    }
    
    // Get stats
    const stats = performanceMonitor.getOperationStats('mongodb', 'bulkTest');
    
    // With 10% sampling, expect roughly 5-15 operations to be recorded
    expect(stats.count).toBeGreaterThanOrEqual(1);
    expect(stats.count).toBeLessThan(100);
  });
});
