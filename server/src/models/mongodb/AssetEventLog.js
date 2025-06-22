const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AssetEventLogSchema = new Schema({
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
  event_type: {
    type: String,
    required: true,
    enum: ['ERROR', 'WARNING', 'INFO', 'MAINTENANCE']
  },
  message: {
    type: String,
    required: true
  },
  details: {
    type: Schema.Types.Mixed,
    default: {}
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledged_by: {
    type: String,
    default: null
  },
  acknowledged_at: {
    type: Date,
    default: null
  }
}, { 
  timestamps: { 
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Create compound index for queries
AssetEventLogSchema.index({ asset_id: 1, timestamp: 1, event_type: 1 });

// Time-to-live index for automatic data expiration (2 years)
AssetEventLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

const AssetEventLog = mongoose.model('AssetEventLog', AssetEventLogSchema);

module.exports = AssetEventLog;
