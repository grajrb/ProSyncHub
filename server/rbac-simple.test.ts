import request from 'supertest';
import express from 'express';
import { jest, describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Define types
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

// Create a simple middleware for testing RBAC
function authorizeRoles(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

// Create middleware to inject user role for testing
function mockAuth(role: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    req.user = { userId: 'test-user', role };
    next();
  };
}

describe('RBAC Middleware Tests', () => {
  let app: ReturnType<typeof express>;
  let server: any;
    beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Set up test routes with various RBAC permissions
    app.get('/admin-only', 
      (req: AuthenticatedRequest, res, next) => {
        // This will be overridden in each test
        next();
      },
      authorizeRoles('admin'), 
      (_req, res) => res.status(200).json({ access: 'granted' })
    );
    
    app.get('/admin-supervisor', 
      (req: AuthenticatedRequest, res, next) => {
        // This will be overridden in each test
        next();
      },
      authorizeRoles('admin', 'supervisor'), 
      (_req, res) => res.status(200).json({ access: 'granted' })
    );
    
    app.get('/all-staff', 
      (req: AuthenticatedRequest, res, next) => {
        // This will be overridden in each test
        next();
      },
      authorizeRoles('admin', 'supervisor', 'technician', 'operator'), 
      (_req, res) => res.status(200).json({ access: 'granted' })
    );
    
    server = app.listen(0); // Use any available port
  });
  
  afterAll((done) => {
    server.close(done);
  });
  test('Admin can access admin-only routes', async () => {
    // Create a new instance of the app for this test
    const testApp = express();
    testApp.use(express.json());
    
    // Setup route with admin role
    testApp.get('/admin-only', 
      mockAuth('admin'),
      authorizeRoles('admin'), 
      (_req, res) => res.status(200).json({ access: 'granted' })
    );
    
    const res = await request(testApp).get('/admin-only');
    expect(res.status).toBe(200);
  });

  test('Non-admin cannot access admin-only routes', async () => {
    // Create a new instance of the app for this test
    const testApp = express();
    testApp.use(express.json());
    
    // Setup route with supervisor role
    testApp.get('/admin-only', 
      mockAuth('supervisor'),
      authorizeRoles('admin'), 
      (_req, res) => res.status(200).json({ access: 'granted' })
    );
    
    const res = await request(testApp).get('/admin-only');
    expect(res.status).toBe(403);
  });

  test('Supervisor can access admin-supervisor routes', async () => {
    // Create a new instance of the app for this test
    const testApp = express();
    testApp.use(express.json());
    
    // Setup route with supervisor role
    testApp.get('/admin-supervisor', 
      mockAuth('supervisor'),
      authorizeRoles('admin', 'supervisor'), 
      (_req, res) => res.status(200).json({ access: 'granted' })
    );
    
    const res = await request(testApp).get('/admin-supervisor');
    expect(res.status).toBe(200);
  });

  test('Technician can access all-staff routes', async () => {
    // Create a new instance of the app for this test
    const testApp = express();
    testApp.use(express.json());
    
    // Setup route with technician role
    testApp.get('/all-staff', 
      mockAuth('technician'),
      authorizeRoles('admin', 'supervisor', 'technician', 'operator'), 
      (_req, res) => res.status(200).json({ access: 'granted' })
    );
    
    const res = await request(testApp).get('/all-staff');
    expect(res.status).toBe(200);
  });

  test('Viewer cannot access any protected routes', async () => {
    // Create a new instance of the app for each test
    const testApp1 = express();
    testApp1.use(express.json());
    testApp1.get('/admin-only', 
      mockAuth('viewer'),
      authorizeRoles('admin'), 
      (_req, res) => res.status(200).json({ access: 'granted' })
    );
    const adminRes = await request(testApp1).get('/admin-only');
    expect(adminRes.status).toBe(403);
    
    const testApp2 = express();
    testApp2.use(express.json());
    testApp2.get('/admin-supervisor', 
      mockAuth('viewer'),
      authorizeRoles('admin', 'supervisor'), 
      (_req, res) => res.status(200).json({ access: 'granted' })
    );
    const supervisorRes = await request(testApp2).get('/admin-supervisor');
    expect(supervisorRes.status).toBe(403);
    
    const testApp3 = express();
    testApp3.use(express.json());
    testApp3.get('/all-staff', 
      mockAuth('viewer'),
      authorizeRoles('admin', 'supervisor', 'technician', 'operator'), 
      (_req, res) => res.status(200).json({ access: 'granted' })
    );
    const staffRes = await request(testApp3).get('/all-staff');
    expect(staffRes.status).toBe(403);
  });
});
