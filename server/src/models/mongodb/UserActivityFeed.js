const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserActivityFeedSchema = new Schema({
  user_id: {
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
  activity_type: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  related_entity_type: {
    type: String,
    required: false
  },
  related_entity_id: {
    type: String,
    required: false
  },
  details: {
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
UserActivityFeedSchema.index({ user_id: 1, timestamp: 1 });

// Time-to-live index for automatic data expiration (6 months)
UserActivityFeedSchema.index({ timestamp: 1 }, { expireAfterSeconds: 15552000 });

const UserActivityFeed = mongoose.model('UserActivityFeed', UserActivityFeedSchema);

module.exports = UserActivityFeed;
