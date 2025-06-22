const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MaintenanceChecklistSchema = new Schema({
  checklist_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  work_order_id: {
    type: String,
    required: false,
    index: true
  },
  asset_id: {
    type: String,
    required: false,
    index: true
  },
  items: [{
    text: {
      type: String,
      required: true
    },
    is_checked: {
      type: Boolean,
      default: false
    },
    checked_by_user_id: {
      type: String,
      default: null
    },
    checked_at: {
      type: Date,
      default: null
    },
    comments: {
      type: String,
      default: null
    },
    requires_photo: {
      type: Boolean,
      default: false
    },
    photo_url: {
      type: String,
      default: null
    }
  }],
  created_by_user_id: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'COMPLETED'],
    default: 'ACTIVE'
  }
}, { 
  timestamps: { 
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

const MaintenanceChecklist = mongoose.model('MaintenanceChecklist', MaintenanceChecklistSchema);

module.exports = MaintenanceChecklist;
