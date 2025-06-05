import request from 'supertest';
import express from 'express';
import analyticsRoutes from '../routes/analyticsRoutes';
import { jest } from '@jest/globals';

describe('Analytics & Predictive API', () => {
  let app: express.Express;
  let WorkOrderMock: any;
  let MaintenanceScheduleMock: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { userId: 'test', roles: ['admin'] };
      next();
    });
    // Mock WorkOrder and MaintenanceSchedule models
    WorkOrderMock = [
      { assetId: 'A1', createdAt: new Date('2025-06-01T08:00:00Z'), closedAt: new Date('2025-06-01T12:00:00Z'), cost: 100, downtimeHours: 4 },
      { assetId: 'A1', createdAt: new Date('2025-06-02T08:00:00Z'), closedAt: new Date('2025-06-02T10:00:00Z'), cost: 200, downtimeHours: 2 },
      { assetId: 'A1', createdAt: new Date('2025-06-03T08:00:00Z'), closedAt: new Date('2025-06-03T11:00:00Z'), cost: 150, downtimeHours: 3 }
    ];
    MaintenanceScheduleMock = [
      { assetId: 'A1', nextDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() }, // due in 2 days
      { assetId: 'A2', nextDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() } // due in 10 days
    ];
    jest.resetModules();
    jest.doMock('../models/WorkOrder', () => ({ default: { find: jest.fn(() => WorkOrderMock) } }));
    jest.doMock('../models/MaintenanceSchedule', () => ({ default: { find: jest.fn(() => MaintenanceScheduleMock) } }));
    app.use('/api/analytics', require('../routes/analyticsRoutes').default);
  });

  it('GET /api/analytics/kpi returns correct KPIs', async () => {
    const res = await request(app).get('/api/analytics/kpi?assetId=A1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      mtbf: expect.any(Number),
      mttr: expect.any(Number),
      totalCost: 450,
      downtime: 9
    });
    // MTBF: (time between 1st and 2nd + 2nd and 3rd closedAt) / 2
    const expectedMtbf = ((new Date('2025-06-02T10:00:00Z').getTime() - new Date('2025-06-01T12:00:00Z').getTime()) +
      (new Date('2025-06-03T11:00:00Z').getTime() - new Date('2025-06-02T10:00:00Z').getTime())) / 2 / (1000 * 60 * 60);
    expect(res.body.mtbf).toBeCloseTo(expectedMtbf, 2);
    // MTTR: avg duration
    const expectedMttr = ((4 + 2 + 3) / 3);
    expect(res.body.mttr).toBeCloseTo(expectedMttr, 2);
  });

  it('GET /api/analytics/mtbf returns correct MTBF', async () => {
    const res = await request(app).get('/api/analytics/mtbf?assetId=A1');
    expect(res.statusCode).toBe(200);
    expect(res.body.mtbf).toBeGreaterThan(0);
  });

  it('GET /api/analytics/mttr returns correct MTTR', async () => {
    const res = await request(app).get('/api/analytics/mttr?assetId=A1');
    expect(res.statusCode).toBe(200);
    expect(res.body.mttr).toBeGreaterThan(0);
  });

  it('GET /api/analytics/cost-reports returns correct cost', async () => {
    const res = await request(app).get('/api/analytics/cost-reports?assetId=A1');
    expect(res.statusCode).toBe(200);
    expect(res.body.totalCost).toBe(450);
  });

  it('GET /api/analytics/predictive/maintenance returns predictive alerts for due soon', async () => {
    const res = await request(app).get('/api/analytics/predictive/maintenance?assetId=A1');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((a: any) => a.type === 'maintenance-due-soon')).toBe(true);
  });
});
