import mongoose from 'mongoose';

const SensorDataSchema = new mongoose.Schema({
  sensorId: { type: String, required: true },
  assetId: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  value: { type: Number, required: true },
  status: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' }
});

export default mongoose.model('SensorData', SensorDataSchema);
