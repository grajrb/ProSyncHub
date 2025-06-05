import { EventEmitter } from 'events';

// Performance metrics interface
interface OperationMetrics {
  operation: string;
  service: 'mongodb' | 'redis';
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Statistics for a specific operation
interface OperationStats {
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  successCount: number;
  failureCount: number;
  successRate: number;
}

// Performance monitor options
interface MonitorOptions {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of operations to sample
  retentionPeriod: number; // in milliseconds
  logSlowOperations: boolean;
  slowOperationThreshold: number; // in milliseconds
}

class PerformanceMonitorService extends EventEmitter {
  private metrics: OperationMetrics[] = [];
  private options: MonitorOptions = {
    enabled: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
    sampleRate: parseFloat(process.env.PERFORMANCE_SAMPLE_RATE || '0.1'),
    retentionPeriod: parseInt(process.env.PERFORMANCE_RETENTION_PERIOD || '3600000', 10), // 1 hour default
    logSlowOperations: process.env.LOG_SLOW_OPERATIONS === 'true',
    slowOperationThreshold: parseInt(process.env.SLOW_OPERATION_THRESHOLD || '500', 10) // 500ms default
  };
  
  constructor() {
    super();
    this.startCleanupInterval();
  }
  
  // Record a database operation
  recordOperation(metrics: Omit<OperationMetrics, 'timestamp'>): void {
    if (!this.options.enabled) return;
    
    // Apply sampling rate
    if (Math.random() > this.options.sampleRate) return;
    
    const fullMetrics = {
      ...metrics,
      timestamp: new Date()
    };
    
    this.metrics.push(fullMetrics);
    
    // Emit events for consumers
    this.emit('operation', fullMetrics);
    
    // Log slow operations
    if (this.options.logSlowOperations && fullMetrics.duration > this.options.slowOperationThreshold) {
      console.warn(`Slow ${fullMetrics.service} operation detected:`, {
        operation: fullMetrics.operation,
        duration: fullMetrics.duration,
        metadata: fullMetrics.metadata
      });
    }
  }
  
  // Record MongoDB operation with timing
  async monitorMongoOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;
    
    try {
      return await fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      this.recordOperation({
        operation,
        service: 'mongodb',
        duration,
        success,
        metadata
      });
    }
  }
  
  // Record Redis operation with timing
  async monitorRedisOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;
    
    try {
      return await fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      this.recordOperation({
        operation,
        service: 'redis',
        duration,
        success,
        metadata
      });
    }
  }
  
  // Get statistics for a specific operation
  getOperationStats(service: 'mongodb' | 'redis', operation: string): OperationStats {
    const relevantMetrics = this.metrics.filter(
      m => m.service === service && m.operation === operation
    );
    
    if (relevantMetrics.length === 0) {
      return {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0
      };
    }
    
    const count = relevantMetrics.length;
    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    const durations = relevantMetrics.map(m => m.duration);
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const successCount = relevantMetrics.filter(m => m.success).length;
    
    return {
      count,
      totalDuration,
      avgDuration: totalDuration / count,
      minDuration,
      maxDuration,
      successCount,
      failureCount: count - successCount,
      successRate: successCount / count
    };
  }
  
  // Get all operation statistics
  getAllStats(): Record<string, Record<string, OperationStats>> {
    const services = Array.from(new Set(this.metrics.map(m => m.service)));
    const results: Record<string, Record<string, OperationStats>> = {};
    
    for (const service of services) {
      const operations = Array.from(
        new Set(
          this.metrics
            .filter(m => m.service === service)
            .map(m => m.operation)
        )
      );
      
      results[service] = {};
      
      for (const operation of operations) {
        results[service][operation] = this.getOperationStats(service, operation);
      }
    }
    
    return results;
  }
  
  // Get recent metrics
  getRecentMetrics(limit: number = 100): OperationMetrics[] {
    return this.metrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // Start cleanup interval to remove old metrics
  private startCleanupInterval(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - this.options.retentionPeriod);
      this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
    }, Math.min(this.options.retentionPeriod / 10, 60000)); // Run at most every minute
  }
  
  // Update monitor options
  updateOptions(options: Partial<MonitorOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitorService();

export default performanceMonitor;
