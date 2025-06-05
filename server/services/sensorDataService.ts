import AssetSensorData, { IAssetSensorData } from '../models/AssetSensorData';
import { publishMessage, setCache, getCache } from '../redis';
import { publishSensorEvent } from '../app';
import Redis from 'ioredis';

// Fix: Use new Redis(process.env.REDIS_URL || '') to ensure a string is always passed
const redis = new Redis(process.env.REDIS_URL || '');

const SENSOR_EVENTS_CHANNEL = 'events:sensors';
const SENSOR_DATA_CACHE_TTL = 3600; // 1 hour
const ANOMALY_DETECTION_THRESHOLD = 2.5; // Z-score threshold for anomaly detection

interface SensorDataFilter {
  assetId?: string;
  sensorId?: string;
  sensorType?: string;
  status?: 'normal' | 'warning' | 'critical';
  startDate?: Date;
  endDate?: Date;
}

interface SensorDataAggregation {
  type: 'avg' | 'min' | 'max' | 'sum' | 'count';
  timeUnit: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

interface SensorDataStats {
  min: number;
  max: number;
  avg: number;
  stdDev: number;
  count: number;
  lastUpdated: Date;
}

interface SensorDataBatch {
  assetId: string;
  sensorId: string;
  sensorType: string;
  unit: string;
  readings: {
    timestamp: Date;
    value: number;
    status?: 'normal' | 'warning' | 'critical';
  }[];
}

export const sensorDataService = {
  // Add new sensor data reading
  async addSensorReading(data: Omit<IAssetSensorData, '_id'>): Promise<IAssetSensorData> {
    const sensorReading = new AssetSensorData({
      ...data,
      timestamp: data.timestamp || new Date(),
    });
    
    const savedReading = await sensorReading.save();
    
    // Publish to Redis for real-time updates (standardized channel)
    await publishMessage(SENSOR_EVENTS_CHANNEL, {
      type: 'SENSOR_CREATED',
      data: savedReading,
    });
    
    // Cache the latest reading for this sensor
    await setCache(
      `sensor:${data.assetId}:${data.sensorId}:latest`,
      JSON.stringify(savedReading),
      SENSOR_DATA_CACHE_TTL
    );
    
    // Check for anomalies and publish alerts if needed
    if (data.status === 'warning' || data.status === 'critical') {
      await publishMessage(SENSOR_EVENTS_CHANNEL, {
        type: 'SENSOR_ALERT',
        level: data.status,
        data: savedReading,
      });
    }
    
    return savedReading;
  },
  
  // Batch ingest sensor readings for improved performance
  async ingestSensorDataBatch(batch: SensorDataBatch): Promise<IAssetSensorData[]> {
    try {
      if (!batch.assetId || !batch.sensorId || !Array.isArray(batch.readings) || batch.readings.length === 0) {
        throw new Error('Invalid sensor data batch format');
      }
      
      // Get historical stats for anomaly detection
      const stats = await this.getSensorStats(batch.assetId, batch.sensorId);
      
      // Process each reading with anomaly detection
      const processedReadings = batch.readings.map(reading => {
        // Detect anomalies if we have enough historical data
        let status = reading.status || 'normal';
        if (!reading.status && stats && stats.count > 30) {
          const zScore = Math.abs((reading.value - stats.avg) / stats.stdDev);
          if (zScore > ANOMALY_DETECTION_THRESHOLD * 1.5) {
            status = 'critical';
          } else if (zScore > ANOMALY_DETECTION_THRESHOLD) {
            status = 'warning';
          }
        }
        
        return {
          assetId: batch.assetId,
          sensorId: batch.sensorId,
          sensorType: batch.sensorType,
          value: reading.value,
          unit: batch.unit,
          timestamp: reading.timestamp,
          status,
          metadata: {
            source: 'batch-ingestion',
            rawValue: reading.value
          }
        };
      });
      
      // Save to MongoDB
      const savedData = await AssetSensorData.insertMany(processedReadings);
      
      // Update Redis cache with latest reading
      if (processedReadings.length > 0) {
        const latestReading = processedReadings.reduce((latest, current) => {
          return !latest.timestamp || current.timestamp > latest.timestamp ? current : latest;
        }, processedReadings[0]);
        
        await setCache(
          `sensor:${batch.assetId}:${batch.sensorId}:latest`,
          JSON.stringify(latestReading),
          SENSOR_DATA_CACHE_TTL
        );
        
        // Publish sensor data update event (standardized channel)
        await publishMessage(SENSOR_EVENTS_CHANNEL, {
          type: 'SENSOR_BATCH_UPDATE',
          assetId: batch.assetId,
          sensorId: batch.sensorId,
          count: processedReadings.length,
          latestReading
        });
        
        // If there are any critical or warning statuses, publish alerts
        const criticalReadings = processedReadings.filter(r => r.status === 'critical');
        const warningReadings = processedReadings.filter(r => r.status === 'warning');
        
        if (criticalReadings.length > 0) {
          await publishMessage(SENSOR_EVENTS_CHANNEL, {
            type: 'SENSOR_BATCH_ALERT',
            level: 'critical',
            assetId: batch.assetId,
            sensorId: batch.sensorId,
            readings: criticalReadings,
            timestamp: new Date()
          });
        } else if (warningReadings.length > 0) {
          await publishMessage(SENSOR_EVENTS_CHANNEL, {
            type: 'SENSOR_BATCH_ALERT',
            level: 'warning',
            assetId: batch.assetId,
            sensorId: batch.sensorId,
            readings: warningReadings,
            timestamp: new Date()
          });
        }
      }
      
      return savedData;
    } catch (error) {
      console.error('Error ingesting sensor data batch:', error);
      throw error;
    }
  },
  
  // Get statistical summary of sensor readings for a time period
  async getSensorStats(
    assetId: string,
    sensorId: string,
    startTime: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
    endTime: Date = new Date()
  ): Promise<SensorDataStats | null> {
    try {
      const cacheKey = `sensor:${assetId}:${sensorId}:stats:${startTime.toISOString()}-${endTime.toISOString()}`;
      
      // Try to get from cache first
      const cachedStats = await getCache<SensorDataStats>(cacheKey);
      if (cachedStats) {
        return cachedStats;
      }
      
      // Get stats from MongoDB using aggregation pipeline
      const stats = await AssetSensorData.aggregate([
        {
          $match: {
            assetId,
            sensorId,
            timestamp: { $gte: startTime, $lte: endTime }
          }
        },
        {
          $group: {
            _id: null,
            min: { $min: '$value' },
            max: { $max: '$value' },
            avg: { $avg: '$value' },
            stdDev: { $stdDevSamp: '$value' },
            count: { $sum: 1 },
            lastUpdated: { $max: '$timestamp' }
          }
        }
      ]);
      
      if (stats.length === 0) {
        return null;
      }
      
      const result = {
        min: stats[0].min,
        max: stats[0].max,
        avg: stats[0].avg,
        stdDev: stats[0].stdDev || 0, // Handle case when there's not enough data for stdDev
        count: stats[0].count,
        lastUpdated: stats[0].lastUpdated
      };
      
      // Cache the results for 1 hour
      await setCache(cacheKey, JSON.stringify(result), 3600);
      
      return result;
    } catch (error) {
      console.error('Error calculating sensor stats:', error);
      throw error;
    }
  },

  // Get the latest reading for a specific sensor
  async getLatestSensorReading(assetId: string, sensorId: string): Promise<IAssetSensorData | null> {
    try {
      // Try to get from cache first
      const cachedData = await getCache<IAssetSensorData>(`sensor:${assetId}:${sensorId}:latest`);
      if (cachedData) {
        return cachedData;
      }
      
      // If not in cache, get from database
      const latestReading = await AssetSensorData.findOne(
        { assetId, sensorId },
        {},
        { sort: { timestamp: -1 } }
      );
      
      // Store in cache if found
      if (latestReading) {
        await setCache(
          `sensor:${assetId}:${sensorId}:latest`,
          JSON.stringify(latestReading),
          SENSOR_DATA_CACHE_TTL
        );
      }
      
      return latestReading;
    } catch (error) {
      console.error('Error getting latest sensor reading:', error);
      throw error;
    }
  },
  
  // Get sensor data with filtering
  async getSensorData(
    filter: SensorDataFilter, 
    options: { limit?: number; skip?: number; sort?: string } = {}
  ): Promise<IAssetSensorData[]> {
    const { limit = 100, skip = 0, sort = '-timestamp' } = options;
    const query: any = {};
    
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.sensorId) query.sensorId = filter.sensorId;
    if (filter.sensorType) query.sensorType = filter.sensorType;
    if (filter.status) query.status = filter.status;
    
    // Add date range filtering
    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) query.timestamp.$gte = filter.startDate;
      if (filter.endDate) query.timestamp.$lte = filter.endDate;
    }
    
    return AssetSensorData.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  },
  
  // Get latest sensor reading for a specific asset/sensor
  async getLatestReading(assetId: string, sensorId?: string, sensorType?: string): Promise<IAssetSensorData | null> {
    const query: any = { assetId };
    if (sensorId) query.sensorId = sensorId;
    if (sensorType) query.sensorType = sensorType;
    
    return AssetSensorData.findOne(query)
      .sort({ timestamp: -1 });
  },
  
  // Get latest readings for all sensors of an asset
  async getLatestReadingsForAsset(assetId: string): Promise<IAssetSensorData[]> {
    // Use MongoDB aggregation to get latest reading for each sensor
    return AssetSensorData.aggregate([
      { $match: { assetId } },
      { $sort: { timestamp: -1 } },
      { 
        $group: {
          _id: { sensorId: '$sensorId', sensorType: '$sensorType' },
          doc: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$doc' } }
    ]);
  },
  
  // Get aggregated sensor data (for charts/trends)
  async getAggregatedData(
    filter: SensorDataFilter,
    aggregation: SensorDataAggregation
  ): Promise<any[]> {
    const query: any = {};
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.sensorId) query.sensorId = filter.sensorId;
    if (filter.sensorType) query.sensorType = filter.sensorType;
    if (filter.status) query.status = filter.status;
    
    // Add date range filtering
    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) query.timestamp.$gte = filter.startDate;
      if (filter.endDate) query.timestamp.$lte = filter.endDate;
    }
    
    // Define time grouping based on timeUnit
    let dateFormat;
    switch(aggregation.timeUnit) {
      case 'minute':
        dateFormat = { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' }, hour: { $hour: '$timestamp' }, minute: { $minute: '$timestamp' } };
        break;
      case 'hour':
        dateFormat = { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' }, hour: { $hour: '$timestamp' } };
        break;
      case 'day':
        dateFormat = { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' } };
        break;
      case 'week':
        dateFormat = { year: { $year: '$timestamp' }, week: { $week: '$timestamp' } };
        break;
      case 'month':
        dateFormat = { year: { $year: '$timestamp' }, month: { $month: '$timestamp' } };
        break;
      default:
        dateFormat = { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' } };
    }
    
    // Define aggregation operation
    let aggregationOp;
    switch(aggregation.type) {
      case 'avg':
        aggregationOp = { $avg: '$value' };
        break;
      case 'min':
        aggregationOp = { $min: '$value' };
        break;
      case 'max':
        aggregationOp = { $max: '$value' };
        break;
      case 'sum':
        aggregationOp = { $sum: '$value' };
        break;
      case 'count':
        aggregationOp = { $sum: 1 };
        break;
      default:
        aggregationOp = { $avg: '$value' };
    }
    
    return AssetSensorData.aggregate([
      { $match: query },
      { 
        $group: {
          _id: { ...dateFormat, sensorType: '$sensorType' },
          value: aggregationOp,
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.minute': 1 } }
    ]);
  },
  
  // Delete sensor data by ID
  async deleteSensorData(sensorDataId: string): Promise<boolean> {
    const result = await AssetSensorData.findByIdAndDelete(sensorDataId);
    return !!result;
  },
  
  // Delete sensor data by filter (caution: can delete many records)
  async deleteSensorDataByFilter(filter: SensorDataFilter): Promise<number> {
    const query: any = {};
    
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.sensorId) query.sensorId = filter.sensorId;
    if (filter.sensorType) query.sensorType = filter.sensorType;
    if (filter.status) query.status = filter.status;
    
    // Add date range filtering
    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) query.timestamp.$gte = filter.startDate;
      if (filter.endDate) query.timestamp.$lte = filter.endDate;
    }
    
    const result = await AssetSensorData.deleteMany(query);
    return result.deletedCount;
  },

  // Patch (partial update) sensor data by ID
  async patchSensorData(id: string, update: Partial<IAssetSensorData>) {
    const result = await AssetSensorData.findByIdAndUpdate(id, update, { new: true });
    // TODO: Invalidate Redis cache for this sensor data if caching is used
    return result;
  }
};

export default sensorDataService;