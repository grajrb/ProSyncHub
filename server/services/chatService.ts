import ChatMessage, { IChatMessage } from '../models/ChatMessage';
import { publishMessage, subscribeToChannel, deleteCache } from '../redis';
import { publishSensorEvent } from '../app';

const CHAT_ROOM_PREFIX = 'chat:room:';

export const chatService = {
  // Send a new chat message
  async sendMessage(messageData: Omit<IChatMessage, '_id' | 'timestamp' | 'readBy'>): Promise<IChatMessage> {
    const newMessage = new ChatMessage({
      ...messageData,
      timestamp: new Date(),
      readBy: [messageData.userId],
    });
    const savedMessage = await newMessage.save();
    await publishMessage(`${CHAT_ROOM_PREFIX}${messageData.roomId}`, {
      type: 'NEW_MESSAGE',
      data: savedMessage,
    });
    await deleteCache(`chatRoom:${messageData.roomId}`);
    publishSensorEvent({ type: 'chat:new', data: savedMessage });
    return savedMessage;
  },

  // Get messages for a chat room
  async getRoomMessages(roomId: string, options: { limit?: number; before?: Date } = {}): Promise<IChatMessage[]> {
    const { limit = 50, before } = options;
    const query: any = { roomId };
    if (before) query.timestamp = { $lt: before };
    return ChatMessage.find(query).sort({ timestamp: -1 }).limit(limit);
  },

  // Mark messages as read by a user
  async markMessagesAsRead(roomId: string, userId: string, messageIds?: string[]): Promise<number> {
    const query: any = { roomId, readBy: { $ne: userId } };
    if (messageIds && messageIds.length > 0) query._id = { $in: messageIds };
    const result = await ChatMessage.updateMany(query, { $addToSet: { readBy: userId } });
    await publishMessage(`${CHAT_ROOM_PREFIX}${roomId}`, {
      type: 'MESSAGES_READ',
      data: { userId, roomId, count: result.modifiedCount },
    });
    return result.modifiedCount;
  },

  // Subscribe to chat room messages
  async subscribeToRoom(roomId: string, callback: (data: any) => void): Promise<void> {
    await subscribeToChannel(`${CHAT_ROOM_PREFIX}${roomId}`, callback);
  },

  // Delete a chat message
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const message = await ChatMessage.findById(messageId);
    if (!message) return false;
    if (message.userId !== userId) throw new Error('Unauthorized');
    await message.deleteOne();
    await publishMessage(`${CHAT_ROOM_PREFIX}${message.roomId}`, {
      type: 'MESSAGE_DELETED',
      data: { messageId, roomId: message.roomId },
    });
    await deleteCache(`chatRoom:${message.roomId}`);
    publishSensorEvent({ type: 'chat:delete', id: messageId });
    return true;
  },

  // Get unread message count for a user
  async getUnreadCount(userId: string, roomId?: string): Promise<number | Record<string, number>> {
    if (roomId) {
      return ChatMessage.countDocuments({ roomId, readBy: { $ne: userId } });
    } else {
      const result = await ChatMessage.aggregate([
        { $match: { readBy: { $ne: userId } } },
        { $group: { _id: '$roomId', count: { $sum: 1 } } },
      ]);
      const counts: Record<string, number> = {};
      result.forEach((item) => { counts[item._id] = item.count; });
      return counts;
    }
  },
};

export default chatService;
