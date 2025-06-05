import request from 'supertest';
import express from 'express';
import notificationRoutes from '../routes/notificationRoutes';
import Notification from '../models/Notification';
import { jest } from '@jest/globals';

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface User {
      userId: string;
      roles?: string[];
      role: string;
      [key: string]: any;
    }
    interface Request {
      user?: User;
    }
  }
}

jest.mock('../models/Notification');

const mockNotification = {
  _id: 'notif1',
  userId: 'user1',
  title: 'Test',
  message: 'Test notification',
  type: 'info',
  isRead: false,
  createdAt: new Date(),
};

describe('Notification API', () => {
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
    app.use('/api/notifications', notificationRoutes);
  });

  afterEach(() => jest.clearAllMocks());

  it('POST /api/notifications creates notification and publishes', async () => {
    jest.spyOn(Notification.prototype, 'save').mockResolvedValueOnce(mockNotification as any);
    const res = await request(app).post('/api/notifications').send(mockNotification);
    expect(res.statusCode).toBe(201);
    expect(app.locals.redisPublisher.set).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('events:notifications', expect.any(String));
  });

  it('PATCH /api/notifications/:id updates notification and publishes', async () => {
    (Notification.findByIdAndUpdate as any).mockResolvedValue(mockNotification);
    const res = await request(app).patch('/api/notifications/notif1').send({ isRead: true });
    expect(res.statusCode).toBe(200);
    expect(app.locals.redisPublisher.set).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('events:notifications', expect.any(String));
  });

  it('DELETE /api/notifications/:id deletes notification and publishes', async () => {
    (Notification.findByIdAndDelete as any).mockResolvedValue(true);
    const res = await request(app).delete('/api/notifications/notif1');
    expect(res.statusCode).toBe(200);
    expect(app.locals.redisPublisher.del).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('events:notifications', expect.any(String));
  });
});
