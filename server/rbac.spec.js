const request = require('supertest');
const express = require('express');

// Mock authorization middleware
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

// Mock authentication middleware
function mockAuth(role) {
  return (req, _res, next) => {
    req.user = { userId: 'test-user', role };
    next();
  };
}

describe('RBAC Middleware Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Set up test routes with RBAC
    app.get('/admin-only', authorizeRoles('admin'), (_req, res) => {
      res.status(200).json({ access: 'granted' });
    });

    app.get('/admin-supervisor', authorizeRoles('admin', 'supervisor'), (_req, res) => {
      res.status(200).json({ access: 'granted' });
    });

    app.get('/all-staff', authorizeRoles('admin', 'supervisor', 'technician', 'operator'), (_req, res) => {
      res.status(200).json({ access: 'granted' });
    });

    server = app.listen(3333);
  });

  afterAll(done => {
    server.close(done);
  });

  test('Admin can access admin-only routes', async () => {
    app.use(mockAuth('admin'));
    const res = await request(app).get('/admin-only');
    expect(res.status).toBe(200);
  });

  test('Non-admin cannot access admin-only routes', async () => {
    app.use(mockAuth('supervisor'));
    const res = await request(app).get('/admin-only');
    expect(res.status).toBe(403);
  });

  test('Supervisor can access admin-supervisor routes', async () => {
    app.use(mockAuth('supervisor'));
    const res = await request(app).get('/admin-supervisor');
    expect(res.status).toBe(200);
  });

  test('Technician can access all-staff routes', async () => {
    app.use(mockAuth('technician'));
    const res = await request(app).get('/all-staff');
    expect(res.status).toBe(200);
  });

  test('Viewer cannot access any protected routes', async () => {
    app.use(mockAuth('viewer'));
    
    const adminRes = await request(app).get('/admin-only');
    expect(adminRes.status).toBe(403);
    
    const supervisorRes = await request(app).get('/admin-supervisor');
    expect(supervisorRes.status).toBe(403);
    
    const staffRes = await request(app).get('/all-staff');
    expect(staffRes.status).toBe(403);
  });
});
