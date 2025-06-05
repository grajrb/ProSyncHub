import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: string; // User to whom the notification is addressed
  type: 'info' | 'warning' | 'alert' | 'reminder' | 'system' | 'other';
  title: string;
  message: string;
  status: 'unread' | 'read' | 'archived' | 'deleted';
  relatedResource?: {
    type: string;
    refId: string;
  };
  data?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['info', 'warning', 'alert', 'reminder', 'system', 'other'],
      default: 'info',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['unread', 'read', 'archived', 'deleted'],
      default: 'unread',
      index: true,
    },
    relatedResource: {
      type: {
        type: String,
      },
      refId: String,
    },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
