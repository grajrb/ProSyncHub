import request from 'supertest';
import express from 'express';
import checklistRoutes from '../routes/checklistRoutes';
import Checklist from '../models/Checklist';
import { jest } from '@jest/globals';

jest.mock('../models/Checklist');

const mockChecklist = {
  _id: 'cl1',
  type: 'maintenance',
  status: 'active',
  assetId: 'asset1',
  items: [{ completed: false }, { completed: true }],
  updatedAt: new Date(),
  createdAt: new Date(),
};

describe('Checklist API', () => {
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
    app.use('/api/checklists', checklistRoutes);
  });

  afterEach(() => jest.clearAllMocks());

  it('GET /api/checklists/analytics returns analytics', async () => {
    (Checklist.find as any).mockReturnValueOnce([mockChecklist]);
    const res = await request(app).get('/api/checklists/analytics');
    expect(res.statusCode).toBe(200);
    expect(res.body.perType.maintenance).toBe(1);
    expect(res.body.perStatus.active).toBe(1);
  });

  it('GET /api/checklists/analytics returns trend and perType', async () => {
    const now = new Date();
    const logs = Array.from({ length: 5 }, (_, i) => ({
      ...mockChecklist,
      type: i % 2 === 0 ? 'maintenance' : 'inspection',
      status: i % 2 === 0 ? 'active' : 'completed',
      createdAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
    }));
    (Checklist.find as any).mockReturnValueOnce(logs);
    const res = await request(app).get('/api/checklists/analytics');
    expect(res.statusCode).toBe(200);
    expect(res.body.perType.maintenance).toBeGreaterThan(0);
    expect(res.body.trend.length).toBeGreaterThan(0);
  });

  it('POST /api/checklists creates checklist and publishes', async () => {
    jest.spyOn(Checklist.prototype, 'save').mockResolvedValueOnce(mockChecklist as any);
    const res = await request(app).post('/api/checklists').send(mockChecklist);
    expect(res.statusCode).toBe(201);
    expect(app.locals.redisPublisher.set).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('events:checklists', expect.any(String));
  });

  it('PATCH /api/checklists/:id updates checklist and publishes', async () => {
    (Checklist.findByIdAndUpdate as any).mockResolvedValue(mockChecklist);
    const res = await request(app).patch('/api/checklists/cl1').send({ status: 'completed' });
    expect(res.statusCode).toBe(200);
    expect(app.locals.redisPublisher.set).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('events:checklists', expect.any(String));
  });

  it('DELETE /api/checklists/:id deletes checklist and publishes', async () => {
    (Checklist.findByIdAndDelete as any).mockResolvedValue(true);
    const res = await request(app).delete('/api/checklists/cl1');
    expect(res.statusCode).toBe(200);
    expect(app.locals.redisPublisher.del).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('events:checklists', expect.any(String));
  });

  it('GET /api/checklists/predictive-alerts returns predictive alerts', async () => {
    // Simulate overdue checklist
    (Checklist.find as any).mockReturnValueOnce([
      { ...mockChecklist, dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), status: 'active' }
    ]);
    const res = await request(app).get('/api/checklists/predictive-alerts');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
