import mongoose, { Document, Schema } from 'mongoose';

export interface IEventLog extends Document {
  eventType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  details?: Record<string, any>;
  userId?: string;
  assetId?: string;
  workOrderId?: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

const EventLogSchema = new Schema<IEventLog>({
  eventType: { type: String, required: true, index: true },
  severity: { 
    type: String, 
    enum: ['info', 'warning', 'error', 'critical'], 
    default: 'info',
    index: true
  },
  source: { type: String, required: true, index: true },
  message: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  userId: { type: String, index: true },
  assetId: { type: String, index: true },
  workOrderId: { type: String, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  acknowledged: { type: Boolean, default: false, index: true },
  acknowledgedBy: { type: String },
  acknowledgedAt: { type: Date }
}, { 
  timestamps: true 
});

// Compound indices for common query patterns
EventLogSchema.index({ severity: 1, acknowledged: 1, timestamp: -1 });
EventLogSchema.index({ eventType: 1, timestamp: -1 });
EventLogSchema.index({ assetId: 1, severity: 1, timestamp: -1 });
EventLogSchema.index({ timestamp: -1 });

const EventLog = mongoose.models.EventLog || 
  mongoose.model<IEventLog>('EventLog', EventLogSchema);

export default EventLog;