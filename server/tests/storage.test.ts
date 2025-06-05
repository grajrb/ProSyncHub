import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage';
import Checklist from '../models/Checklist';
import { DatabaseStorage } from '../storage';

const storage = new DatabaseStorage();

describe('DatabaseStorage CRUD Operations', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testdb'); // removed useNewUrlParser and useUnifiedTopology
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('ChatMessage CRUD', () => {
    let messageId: string;

    it('should create a chat message', async () => {
      const message = await storage.createChatMessage({
        userId: 'user1',
        username: 'testuser',
        message: 'Hello, world!',
        roomId: 'room1',
        timestamp: new Date(),
        isSystemMessage: false,
        readBy: [],
      });
      messageId = (message._id as any).toString(); // use message._id.toString() for type safety
      expect(message).toHaveProperty('_id');
    });

    it('should retrieve chat messages', async () => {
      const messages = await storage.getChatMessages('room1');
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should delete a chat message', async () => {
      const result = await storage.deleteChatMessage(messageId);
      expect(result).toBe(true);
    });
  });

  describe('Checklist CRUD', () => {
    let checklistId: string;

    it('should create a checklist', async () => {
      const checklist = await storage.createChecklist({
        title: 'Test Checklist',
        type: 'maintenance',
        status: 'draft',
        priority: 'medium',
        items: [],
        progress: 0,
        createdBy: 'user1',
      });
      checklistId = (checklist._id as any).toString(); // use checklist._id.toString() for type safety
      expect(checklist).toHaveProperty('_id');
    });

    it('should retrieve checklists', async () => {
      const checklists = await storage.getChecklists({});
      expect(checklists.length).toBeGreaterThan(0);
    });

    it('should update a checklist', async () => {
      const updatedChecklist = await storage.updateChecklist(checklistId, { title: 'Updated Checklist' });
      expect(updatedChecklist?.title).toBe('Updated Checklist');
    });

    it('should delete a checklist', async () => {
      const result = await storage.deleteChecklist(checklistId);
      expect(result).toBe(true);
    });
  });
});
