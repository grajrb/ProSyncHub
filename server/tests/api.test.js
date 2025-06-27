// Setup test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PORT = '5001';

const request = require('supertest');
const { app } = require('../src/index');
const { sequelize } = require('../src/config/postgresConfig');

beforeAll(async () => {
  // Connect to test database and sync models
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  } catch (error) {
    console.error('Test database setup error:', error);
  }
});

afterAll(async () => {
  // Close database connections
  await sequelize.close();
});

describe('API Endpoints', () => {
  let authToken;
  
  // Test health check endpoint
  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });
  
  // Test auth endpoints
  describe('Auth API', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User'
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
    });
    
    it('should login a user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
      
      // Save token for other tests
      authToken = res.body.token;
    });
  });
  
  // Test asset endpoints
  describe('Assets API', () => {
    let assetId;
    
    it('should create a new asset', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Pump',
          asset_tag: 'PUMP-001',
          description: 'Test pump for API testing',
          asset_type_id: 1,
          location_id: 1,
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          serial_number: 'SN12345',
          installation_date: '2023-01-01',
          status: 'ONLINE'
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.asset).toBeDefined();
      expect(res.body.asset.name).toEqual('Test Pump');
      
      assetId = res.body.asset.asset_id;
    });
    
    it('should get all assets', async () => {
      const res = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body.assets)).toBe(true);
      expect(res.body.assets.length).toBeGreaterThan(0);
    });
    
    it('should get a specific asset', async () => {
      const res = await request(app)
        .get(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.asset).toBeDefined();
      expect(res.body.asset.asset_id).toEqual(assetId);
    });
  });
});
