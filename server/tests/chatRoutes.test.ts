import request from 'supertest';
import express from 'express';
import chatRoutes from '../routes/chatRoutes';
import ChatMessage from '../models/ChatMessage';
import { jest } from '@jest/globals';

jest.mock('../models/ChatMessage');

const mockMessage = {
  _id: 'msg1',
  senderId: 'user1',
  message: 'Hello',
  workOrderId: 'wo1',
  timestamp: new Date(),
};

describe('Chat API', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { userId: 'test', roles: ['admin'], role: 'admin' };
      req.app = app;
      app.locals.redisPublisher = {
        set: jest.fn(),
        publish: jest.fn(),
        del: jest.fn(),
        get: jest.fn(),
      };
      next();
    });
    app.use('/api/chat', chatRoutes);
  });

  afterEach(() => jest.clearAllMocks());

  it('POST /api/chat creates message and publishes', async () => {
    jest.spyOn(ChatMessage.prototype, 'save').mockResolvedValueOnce(mockMessage as any);
    const res = await request(app).post('/api/chat').send(mockMessage);
    expect(res.statusCode).toBe(201);
    expect(app.locals.redisPublisher.set).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('events:chat', expect.any(String));
  });

  it('PATCH /api/chat/:id updates message and publishes', async () => {
    (ChatMessage.findByIdAndUpdate as any).mockResolvedValue(mockMessage);
    const res = await request(app).patch('/api/chat/msg1').send({ message: 'Updated' });
    expect(res.statusCode).toBe(200);
    expect(app.locals.redisPublisher.set).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('events:chat', expect.any(String));
  });

  it('DELETE /api/chat/:id deletes message and publishes', async () => {
    (ChatMessage.findByIdAndDelete as any).mockResolvedValue(true);
    const res = await request(app).delete('/api/chat/msg1');
    expect(res.statusCode).toBe(200);
    expect(app.locals.redisPublisher.del).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('events:chat', expect.any(String));
  });

  it('GET /api/chat/kpi returns chat KPIs', async () => {
    (ChatMessage.find as any).mockReturnValueOnce([
      { ...mockMessage, senderId: 'user1', timestamp: new Date('2025-06-01T10:00:00Z') },
      { ...mockMessage, senderId: 'user2', timestamp: new Date('2025-06-01T10:05:00Z') },
      { ...mockMessage, senderId: 'user1', timestamp: new Date('2025-06-01T10:10:00Z') },
    ]);
    const res = await request(app).get('/api/chat/kpi');
    expect(res.statusCode).toBe(200);
    expect(res.body.totalMessages).toBe(3);
    expect(res.body.activeUsers).toBe(2);
    expect(res.body.avgResponseTime).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/chat/stats returns chat stats', async () => {
    (ChatMessage.find as any).mockReturnValueOnce([
      { ...mockMessage, senderId: 'user1', timestamp: new Date('2025-06-01T10:00:00Z') },
      { ...mockMessage, senderId: 'user2', timestamp: new Date('2025-06-01T10:05:00Z') },
      { ...mockMessage, senderId: 'user1', timestamp: new Date('2025-06-01T10:10:00Z') },
    ]);
    const res = await request(app).get('/api/chat/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.perUser.user1).toBeGreaterThan(0);
    expect(res.body.perDay).toBeDefined();
  });

  it('GET /api/chat/predictive-alerts returns predictive alerts', async () => {
    // Inactive chat (no messages in 48h)
    (ChatMessage.find as any).mockReturnValueOnce([
      { ...mockMessage, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 49) }
    ]);
    const res = await request(app).get('/api/chat/predictive-alerts');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
