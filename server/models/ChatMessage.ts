import mongoose, { Document, Schema } from 'mongoose';

export interface IChatMessage extends Document {
  userId: string;
  username: string;
  message: string;
  roomId: string;
  timestamp: Date;
  isSystemMessage: boolean;
  attachments?: Array<{ type: string; url: string; name: string }>;
  readBy: string[];
}

const ChatMessageSchema = new Schema<IChatMessage>({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  message: { type: String, required: true },
  roomId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  isSystemMessage: { type: Boolean, default: false },
  attachments: [
    {
      type: { type: String, enum: ['image', 'document', 'link'] },
      url: String,
      name: String,
    },
  ],
  readBy: [{ type: String, index: true }],
}, { timestamps: true });

ChatMessageSchema.index({ roomId: 1, timestamp: -1 });
ChatMessageSchema.index({ userId: 1, timestamp: -1 });

const ChatMessage = mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessage;
