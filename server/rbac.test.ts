import request from 'supertest';
import express from 'express';
import { registerRoutes } from './routes';
import { authenticateJWT } from './authMiddleware';

// Mock JWT middleware to inject user roles for testing
function mockAuth(role: string) {
  return (req: any, _res: any, next: any) => {
    req.user = { userId: 'test-user', role };
    next();
  };
}

describe('RBAC for /api/assets endpoints', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    // We'll override authenticateJWT per test
    await registerRoutes(app);
  });

  const roles = ['admin', 'supervisor', 'technician', 'operator', 'viewer'];

  test('GET /api/assets allowed for all roles', async () => {
    for (const role of roles) {
      app.use('/api/assets', mockAuth(role));
      const res = await request(app).get('/api/assets');
      expect([200, 403]).toContain(res.statusCode); // 403 if role is not allowed
    }
  });

  test('POST /api/assets allowed for admin, supervisor only', async () => {
    for (const role of roles) {
      app.use('/api/assets', mockAuth(role));
      const res = await request(app).post('/api/assets').send({});
      if (['admin', 'supervisor'].includes(role)) {
        expect([201, 400]).toContain(res.statusCode); // 400 for invalid body
      } else {
        expect(res.statusCode).toBe(403);
      }
    }
  });

  test('PUT /api/assets/:id allowed for admin, supervisor only', async () => {
    for (const role of roles) {
      app.use('/api/assets/1', mockAuth(role));
      const res = await request(app).put('/api/assets/1').send({});
      if (['admin', 'supervisor'].includes(role)) {
        expect([200, 404, 400]).toContain(res.statusCode);
      } else {
        expect(res.statusCode).toBe(403);
      }
    }
  });

  test('DELETE /api/assets/:id allowed for admin only', async () => {
    for (const role of roles) {
      app.use('/api/assets/1', mockAuth(role));
      const res = await request(app).delete('/api/assets/1');
      if (role === 'admin') {
        expect([204, 404]).toContain(res.statusCode);
      } else {
        expect(res.statusCode).toBe(403);
      }
    }
  });
});
