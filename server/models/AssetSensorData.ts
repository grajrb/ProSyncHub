import mongoose, { Document, Schema } from 'mongoose';

export interface IAssetSensorData extends Document {
  assetId: string;
  sensorId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

const AssetSensorDataSchema = new Schema<IAssetSensorData>({
  assetId: { type: String, required: true, index: true },
  sensorId: { type: String, required: true, index: true },
  sensorType: { type: String, required: true, index: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  status: { 
    type: String, 
    enum: ['normal', 'warning', 'critical'], 
    default: 'normal',
    index: true
  },
  metadata: { type: Schema.Types.Mixed }
}, { 
  timestamps: true, 
  // Enable time series collection for efficient time-based queries
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'seconds'
  }
});

// Compound indices for common query patterns
AssetSensorDataSchema.index({ assetId: 1, sensorType: 1, timestamp: -1 });
AssetSensorDataSchema.index({ assetId: 1, status: 1, timestamp: -1 });
AssetSensorDataSchema.index({ sensorId: 1, timestamp: -1 });

const AssetSensorData = mongoose.models.AssetSensorData || 
  mongoose.model<IAssetSensorData>('AssetSensorData', AssetSensorDataSchema);

export default AssetSensorData;