import mongoose, { Document, Schema } from 'mongoose';

export interface IChecklistItem extends Document {
  title: string;
  description?: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: Date;
  notes?: string;
  attachments?: Array<{ type: string; url: string; name: string }>;
}

export interface IChecklist extends Document {
  title: string;
  description?: string;
  type: 'maintenance' | 'inspection' | 'safety' | 'procedure' | 'other';
  assetId?: string;
  workOrderId?: string;
  assignedTo?: string[];
  dueDate?: Date;
  status: 'draft' | 'active' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  items: IChecklistItem[];
  progress: number;
  createdBy: string;
  modifiedBy?: string;
  completedBy?: string;
  completedAt?: Date;
}

const ChecklistItemSchema = new Schema<IChecklistItem>({
  title: { type: String, required: true },
  description: { type: String },
  isCompleted: { type: Boolean, default: false },
  completedBy: { type: String },
  completedAt: { type: Date },
  notes: { type: String },
  attachments: [
    {
      type: { type: String, enum: ['image', 'document', 'link'] },
      url: String,
      name: String,
    },
  ],
});

const ChecklistSchema = new Schema<IChecklist>({
  title: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['maintenance', 'inspection', 'safety', 'procedure', 'other'], 
    default: 'maintenance',
    index: true
  },
  assetId: { type: String, index: true },
  workOrderId: { type: String, index: true },
  assignedTo: [{ type: String, index: true }],
  dueDate: { type: Date, index: true },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'completed', 'overdue', 'cancelled'], 
    default: 'draft',
    index: true
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium',
    index: true
  },
  items: [ChecklistItemSchema],
  progress: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 100 
  },
  createdBy: { type: String, required: true, index: true },
  modifiedBy: { type: String },
  completedBy: { type: String },
  completedAt: { type: Date }
}, { 
  timestamps: true 
});

// Calculate progress when saving the document
ChecklistSchema.pre('save', function(next) {
  const checklist = this;
  if (checklist.items && checklist.items.length > 0) {
    const completedItems = checklist.items.filter(item => item.isCompleted).length;
    checklist.progress = Math.round((completedItems / checklist.items.length) * 100);
    
    // Update status to completed if all items are completed
    if (checklist.progress === 100 && checklist.status !== 'completed') {
      checklist.status = 'completed';
      checklist.completedAt = new Date();
    }
  }
  next();
});

// Compound indices for common query patterns
ChecklistSchema.index({ status: 1, dueDate: 1 });
ChecklistSchema.index({ assetId: 1, status: 1 });
ChecklistSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
ChecklistSchema.index({ createdBy: 1, status: 1 });

const Checklist = mongoose.models.Checklist || 
  mongoose.model<IChecklist>('Checklist', ChecklistSchema);

export default Checklist;