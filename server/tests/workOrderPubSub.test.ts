// Integration test for work order Redis pub/sub events
import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import { Server } from 'http';
import { connectToMongoDB, disconnectFromMongoDB } from '../mongodb';
// import { connectToRedis } from '../redis';
import { redisClientMock as connectToRedis } from './jest.setup.redis-mock.new';
import { redisClientMock } from './jest.setup.redis-mock.new';
// import { storage } from '../storage';
import { registerRoutes } from '../routes';

// Mock JWT and RBAC middleware
jest.mock('../authMiddleware.ts', () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => next(),
  authorizeRoles: (..._roles: string[]) => (_req: any, _res: any, next: any) => next(),
  AuthRequest: jest.fn()
}));
jest.mock('../rbac.ts', () => ({
  requirePermission: (_resource: string, _action: string) => (_req: any, _res: any, next: any) => next(),
  requirePermissionAuto: () => (_req: any, _res: any, next: any) => next(),
  requireRoles: (..._roles: string[]) => (_req: any, _res: any, next: any) => next()
}));

const mockWorkOrder = {
  title: 'Test Work Order',
  description: 'Test description',
  assetId: 1,
  status: 'open',
  priority: 'medium',
  type: 'corrective',
  reportedByUserId: 'user1',
};

describe('Work Order Redis Pub/Sub Events', () => {
  let app: express.Express;
  let server: Server;

  beforeAll(async () => {
    await connectToMongoDB();
    await redisClientMock.connect();
    app = express();
    app.use(express.json());
    server = app.listen(0);
    await registerRoutes(app);
  });

  afterAll(async () => {
    server.close();
    await disconnectFromMongoDB();
    await redisClientMock.quit();
  });

  it('should publish WORK_ORDER_CREATED event to Redis on create', async () => {
    redisClientMock.publish.mockClear();
    const res = await request(app)
      .post('/api/work-orders')
      .send(mockWorkOrder);
    expect(res.status).toBe(201);
    // Check Redis publish was called with correct channel and event
    expect(redisClientMock.publish).toHaveBeenCalledWith(
      'events:workorders',
      expect.stringContaining('WORK_ORDER_CREATED')
    );
  });

  it('should publish WORK_ORDER_UPDATED event to Redis on update', async () => {
    redisClientMock.publish.mockClear();
    // Create first
    const createRes = await request(app)
      .post('/api/work-orders')
      .send(mockWorkOrder);
    const workOrderId = createRes.body.id;
    // Update
    const res = await request(app)
      .put(`/api/work-orders/${workOrderId}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(redisClientMock.publish).toHaveBeenCalledWith(
      'events:workorders',
      expect.stringContaining('WORK_ORDER_UPDATED')
    );
  });

  it('should publish WORK_ORDER_DELETED event to Redis on delete', async () => {
    redisClientMock.publish.mockClear();
    // Create first
    const createRes = await request(app)
      .post('/api/work-orders')
      .send(mockWorkOrder);
    const workOrderId = createRes.body.id;
    // Delete
    const res = await request(app)
      .delete(`/api/work-orders/${workOrderId}`);
    expect([204, 200, 404]).toContain(res.status);
    expect(redisClientMock.publish).toHaveBeenCalledWith(
      'events:workorders',
      expect.stringContaining('WORK_ORDER_DELETED')
    );
  });
});
