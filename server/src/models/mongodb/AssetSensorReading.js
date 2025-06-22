const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AssetSensorReadingSchema = new Schema({
  asset_id: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  sensor_type: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  raw_data: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, { 
  timestamps: { 
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Create compound index for queries
AssetSensorReadingSchema.index({ asset_id: 1, timestamp: 1, sensor_type: 1 });

// Time-to-live index for automatic data expiration (1 year)
AssetSensorReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

const AssetSensorReading = mongoose.model('AssetSensorReading', AssetSensorReadingSchema);

module.exports = AssetSensorReading;
