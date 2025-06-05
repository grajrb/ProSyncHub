import request from 'supertest';
import express from 'express';
import eventLogRoutes from '../routes/eventLogRoutes';
import EventLog from '../models/EventLog';
import { jest } from '@jest/globals';

jest.mock('../models/EventLog');

const mockEventLog = {
  _id: 'logid1',
  eventType: 'critical',
  severity: 'critical',
  source: 'sensor',
  message: 'Overheat',
  assetId: 'asset1',
  timestamp: new Date(),
  acknowledged: false,
};

describe('EventLog API', () => {
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
    app.use('/api/event-logs', eventLogRoutes);
  });

  afterEach(() => jest.clearAllMocks());

  it('GET /api/event-logs returns logs', async () => {
    (EventLog.find as any).mockReturnValueOnce({ sort: () => ({ limit: () => [mockEventLog] }) });
    const res = await request(app).get('/api/event-logs');
    expect(res.statusCode).toBe(200);
    expect(res.body[0].eventType).toBe('critical');
  });

  it('POST /api/event-logs creates log and publishes', async () => {
    jest.spyOn(EventLog.prototype, 'save').mockResolvedValue(mockEventLog as any);
    const res = await request(app).post('/api/event-logs').send(mockEventLog);
    expect(res.statusCode).toBe(201);
    expect(app.locals.redisPublisher.set).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('events:eventlogs', expect.any(String));
  });

  it('PATCH /api/event-logs/:id updates log and publishes', async () => {
    (EventLog.findByIdAndUpdate as any).mockResolvedValue(mockEventLog);
    const res = await request(app).patch('/api/event-logs/logid1').send({ message: 'Updated' });
    expect(res.statusCode).toBe(200);
    expect(app.locals.redisPublisher.set).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('events:eventlogs', expect.any(String));
  });

  it('DELETE /api/event-logs/:id deletes log and publishes', async () => {
    (EventLog.findByIdAndDelete as any).mockResolvedValue(true);
    const res = await request(app).delete('/api/event-logs/logid1');
    expect(res.statusCode).toBe(200);
    expect(app.locals.redisPublisher.del).toHaveBeenCalled();
    expect(app.locals.redisPublisher.publish).toHaveBeenCalledWith('eventlog-events', expect.any(String));
  });

  it('GET /api/event-logs/analytics returns analytics', async () => {
    (EventLog.find as any).mockReturnValueOnce([mockEventLog]);
    const res = await request(app).get('/api/event-logs/analytics');
    expect(res.statusCode).toBe(200);
    expect(res.body.perType.critical).toBe(1);
  });

  it('GET /api/event-logs/analytics returns trend and movingAvg', async () => {
    // Simulate 10 logs over 10 days
    const logs = Array.from({ length: 10 }, (_, i) => ({
      ...mockEventLog,
      timestamp: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000),
      eventType: i < 5 ? 'critical' : 'warning',
      severity: i < 5 ? 'critical' : 'warning',
      assetId: 'asset1',
    }));
    (EventLog.find as any).mockReturnValueOnce(logs);
    const res = await request(app).get('/api/event-logs/analytics');
    expect(res.statusCode).toBe(200);
    expect(res.body.trend.length).toBeGreaterThan(0);
    expect(res.body.movingAvg.length).toBeGreaterThan(0);
    expect(res.body.perType.critical).toBe(5);
    expect(res.body.perType.warning).toBe(5);
  });

  it('GET /api/event-logs/predictive-alerts returns alerts', async () => {
    (EventLog.find as any).mockReturnValueOnce([mockEventLog, { ...mockEventLog, timestamp: new Date() }]);
    const res = await request(app).get('/api/event-logs/predictive-alerts');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/event-logs/predictive-alerts detects anomaly spike', async () => {
    // 6 logs today, 1 per day for previous 6 days
    const today = new Date();
    const logs = [
      ...Array.from({ length: 6 }, () => ({ ...mockEventLog, timestamp: today, eventType: 'warning', assetId: 'asset1' })),
      ...Array.from({ length: 6 }, (_, i) => ({ ...mockEventLog, timestamp: new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000), eventType: 'warning', assetId: 'asset1' }))
    ];
    (EventLog.find as any).mockReturnValueOnce(logs);
    const res = await request(app).get('/api/event-logs/predictive-alerts');
    expect(res.statusCode).toBe(200);
    expect(res.body.some((a: any) => a.type === 'anomaly-spike')).toBe(true);
  });
});
