const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChatMessageSchema = new Schema({
  room_id: {
    type: String,
    required: true,
    index: true
  },
  room_type: {
    type: String,
    required: true,
    enum: ['WORK_ORDER', 'ASSET', 'TEAM', 'DIRECT']
  },
  sender_user_id: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  message_content: {
    type: String,
    required: true
  },
  attachments: {
    type: Array,
    default: []
  },
  read_by: {
    type: [String],
    default: []
  }
}, { 
  timestamps: { 
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Create compound index for queries
ChatMessageSchema.index({ room_id: 1, timestamp: 1 });

// Time-to-live index for automatic data expiration (1 year)
ChatMessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);

module.exports = ChatMessage;
