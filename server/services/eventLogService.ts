import EventLog, { IEventLog } from '../models/EventLog';
import { publishMessage } from '../redis';
import { publishSensorEvent } from '../app';
import Redis from 'ioredis';

// Fix: Use new Redis(process.env.REDIS_URL || '') to ensure a string is always passed
const redis = new Redis(process.env.REDIS_URL || '');

const EVENT_LOG_CHANNEL = 'event:logs';
const EVENT_ALERT_CHANNEL = 'event:alerts';

interface EventLogFilter {
  eventType?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  source?: string;
  userId?: string;
  assetId?: string;
  workOrderId?: string;
  acknowledged?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export const eventLogService = {
  // Create a new event log
  async createEventLog(data: Omit<IEventLog, '_id' | 'timestamp' | 'acknowledged' | 'acknowledgedBy' | 'acknowledgedAt'>): Promise<IEventLog> {
    const eventLog = new EventLog({
      ...data,
      timestamp: data.timestamp || new Date(),
      acknowledged: false,
    });
    
    const savedEventLog = await eventLog.save();
    
    // Publish to Redis for real-time updates
    await publishMessage(EVENT_LOG_CHANNEL, {
      type: 'NEW_EVENT',
      data: savedEventLog,
    });
    
    // If severity is error or critical, publish an alert
    if (data.severity === 'error' || data.severity === 'critical') {
      await publishMessage(EVENT_ALERT_CHANNEL, {
        type: 'EVENT_ALERT',
        data: savedEventLog,
      });
    }
    
    await redis.del(`eventLogs:${data.assetId}`);
    publishSensorEvent({ type: 'eventLog:new', data });
    
    return savedEventLog;
  },
  
  // Get event logs with filtering
  async getEventLogs(
    filter: EventLogFilter, 
    options: { limit?: number; skip?: number; sort?: string } = {}
  ): Promise<IEventLog[]> {
    const { limit = 50, skip = 0, sort = '-timestamp' } = options;
    const query: any = {};
    
    if (filter.eventType) query.eventType = filter.eventType;
    if (filter.severity) query.severity = filter.severity;
    if (filter.source) query.source = filter.source;
    if (filter.userId) query.userId = filter.userId;
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.workOrderId) query.workOrderId = filter.workOrderId;
    if (filter.acknowledged !== undefined) query.acknowledged = filter.acknowledged;
    
    // Add date range filtering
    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) query.timestamp.$gte = filter.startDate;
      if (filter.endDate) query.timestamp.$lte = filter.endDate;
    }
    
    return EventLog.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  },
  
  // Get event log by ID
  async getEventLogById(eventLogId: string): Promise<IEventLog | null> {
    return EventLog.findById(eventLogId);
  },
  
  // Mark event log as acknowledged
  async acknowledgeEventLog(eventLogId: string, userId: string): Promise<IEventLog | null> {
    const eventLog = await EventLog.findByIdAndUpdate(
      eventLogId,
      {
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
      { new: true }
    );
    
    if (eventLog) {
      await publishMessage(EVENT_LOG_CHANNEL, {
        type: 'EVENT_ACKNOWLEDGED',
        data: eventLog,
      });
    }
    
    return eventLog;
  },
  
  // Bulk acknowledge event logs
  async bulkAcknowledgeEventLogs(eventLogIds: string[], userId: string): Promise<number> {
    const result = await EventLog.updateMany(
      { _id: { $in: eventLogIds }, acknowledged: false },
      {
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      }
    );
    
    await publishMessage(EVENT_LOG_CHANNEL, {
      type: 'EVENTS_BULK_ACKNOWLEDGED',
      data: { count: result.modifiedCount, eventLogIds, userId },
    });
    
    return result.modifiedCount;
  },
  
  // Delete event log by ID
  async deleteEventLog(eventLogId: string): Promise<boolean> {
    const result = await EventLog.findByIdAndDelete(eventLogId);
    return !!result;
  },
  
  // Get event counts by severity
  async getEventCountsBySeverity(filter: EventLogFilter = {}): Promise<Record<string, number>> {
    const query: any = {};
    
    if (filter.eventType) query.eventType = filter.eventType;
    if (filter.source) query.source = filter.source;
    if (filter.userId) query.userId = filter.userId;
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.workOrderId) query.workOrderId = filter.workOrderId;
    if (filter.acknowledged !== undefined) query.acknowledged = filter.acknowledged;
    
    // Add date range filtering
    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) query.timestamp.$gte = filter.startDate;
      if (filter.endDate) query.timestamp.$lte = filter.endDate;
    }
    
    const result = await EventLog.aggregate([
      { $match: query },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);
    
    const counts: Record<string, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };
    
    result.forEach((item) => { counts[item._id] = item.count; });
    return counts;
  },
  
  // Get recent events summary
  async getRecentEventsSummary(limit: number = 5): Promise<IEventLog[]> {
    return EventLog.find()
      .sort({ timestamp: -1 })
      .limit(limit);
  },
};