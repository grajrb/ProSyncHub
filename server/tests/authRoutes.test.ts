import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Redis from 'ioredis-mock';
import authRoutes from '../routes/authRoutes';
import { User } from '../models';

// Mock Redis client
jest.mock('../redisClient', () => {
  const redis = new Redis();
  return {
    redisClient: redis,
    default: redis,
  };
});

// Mock Redis functions
jest.mock('../redis', () => {
  const redisMock = new Redis();
  return {
    connectToRedis: jest.fn(),
    disconnectFromRedis: jest.fn(),
    setCache: jest.fn(async (key, value, expiryInSeconds) => {
      await redisMock.set(key, typeof value === 'string' ? value : JSON.stringify(value));
      if (expiryInSeconds) {
        await redisMock.expire(key, expiryInSeconds);
      }
    }),
    getCache: jest.fn(async (key, parseJson = true) => {
      const result = await redisMock.get(key);
      if (!result) return null;
      if (parseJson) {
        try {
          return JSON.parse(result);
        } catch {
          return result;
        }
      }
      return result;
    }),
    deleteCache: jest.fn(async (key) => {
      const result = await redisMock.del(key);
      return result > 0;
    }),
    blacklistToken: jest.fn(async (token, expiryInSeconds) => {
      await redisMock.set(`token:blacklist:${token}`, 'true', 'EX', expiryInSeconds);
    }),
    isTokenBlacklisted: jest.fn(async (token) => {
      const result = await redisMock.get(`token:blacklist:${token}`);
      return result !== null;
    }),
    storeUserSession: jest.fn(async (userId, sessionData, expiryInSeconds) => {
      await redisMock.set(`session:${userId}`, JSON.stringify(sessionData), 'EX', expiryInSeconds);
    }),
    getUserSession: jest.fn(async (userId) => {
      const result = await redisMock.get(`session:${userId}`);
      if (!result) return null;
      return JSON.parse(result);
    }),
    deleteUserSession: jest.fn(async (userId) => {
      const result = await redisMock.del(`session:${userId}`);
      return result > 0;
    }),
    incrementRateLimit: jest.fn(async (key, expiryInSeconds) => {
      const current = await redisMock.get(`ratelimit:${key}`);
      const newValue = current ? parseInt(current) + 1 : 1;
      await redisMock.set(`ratelimit:${key}`, newValue, 'EX', expiryInSeconds);
      return newValue;
    }),
    getRateLimit: jest.fn(async (key) => {
      const result = await redisMock.get(`ratelimit:${key}`);
      return result ? parseInt(result) : 0;
    }),
  };
});

describe('Auth Routes Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  const JWT_SECRET = 'test-jwt-secret';
  
  beforeAll(async () => {
    // Set up MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Set environment variable for JWT
    process.env.JWT_SECRET = JWT_SECRET;
    
    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });
  
  afterAll(async () => {
    // Clean up
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    // Clear the User collection before each test
    await User.deleteMany({});
  });
  
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      // Check response
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
      
      // Check if user is saved in DB
      const savedUser = await User.findOne({ username: userData.username });
      expect(savedUser).not.toBeNull();
      expect(savedUser?.email).toBe(userData.email);
    });
    
    it('should return 400 if required fields are missing', async () => {
      const incompleteData = {
        username: 'testuser',
        // Missing email and password
      };
      
      await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);
    });
    
    it('should return 409 if user already exists', async () => {
      // Create a user first
      const userData = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123'
      };
      
      const user = new User(userData);
      await user.save();
      
      // Try to register the same user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);
    });
  });
  
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const userData = {
        username: 'loginuser',
        email: 'login@example.com',
        password: 'password123',
        role: 'viewer'
      };
      
      const user = new User(userData);
      await user.save();
    });
    
    it('should login a user with valid credentials', async () => {
      const loginData = {
        username: 'loginuser',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);
      
      // Check response
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(loginData.username);
    });
    
    it('should return 401 with invalid credentials', async () => {
      const invalidLoginData = {
        username: 'loginuser',
        password: 'wrongpassword'
      };
      
      await request(app)
        .post('/api/auth/login')
        .send(invalidLoginData)
        .expect(401);
    });
  });
  
  describe('POST /api/auth/logout', () => {
    let validToken: string;
    let userId: string;
    
    beforeEach(async () => {
      // Create a test user
      const userData = {
        username: 'logoutuser',
        email: 'logout@example.com',
        password: 'password123',
        role: 'viewer'
      };
      
      const user = new User(userData);
      await user.save();
      userId = user._id.toString();
      
      // Generate a valid token
      validToken = jwt.sign(
        { userId, role: 'viewer', username: 'logoutuser' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    });
    
    it('should successfully logout a user', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.message).toBe('Logged out successfully');
      
      // Check if token is blacklisted
      const isBlacklisted = await jest.requireMock('../redis').isTokenBlacklisted(validToken);
      expect(isBlacklisted).toBe(true);
    });
    
    it('should return 401 if not authenticated', async () => {
      await request(app)
        .post('/api/auth/logout')
        .expect(401);
    });
  });
  
  describe('GET /api/auth/verify-token', () => {
    let validToken: string;
    let blacklistedToken: string;
    
    beforeEach(async () => {
      // Create a test user
      const user = new User({
        username: 'verifyuser',
        email: 'verify@example.com',
        password: 'password123',
        role: 'viewer'
      });
      await user.save();
      
      // Generate valid token
      validToken = jwt.sign(
        { userId: user._id, role: 'viewer', username: 'verifyuser' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // Generate blacklisted token
      blacklistedToken = jwt.sign(
        { userId: user._id, role: 'viewer', username: 'verifyuser' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // Blacklist the token
      await jest.requireMock('../redis').blacklistToken(blacklistedToken, 3600);
    });
    
    it('should verify a valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-token')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.valid).toBe(true);
    });
    
    it('should reject a blacklisted token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-token')
        .set('Authorization', `Bearer ${blacklistedToken}`)
        .expect(401);
      
      expect(response.body.valid).toBe(false);
    });
    
    it('should reject an invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-token')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
      
      expect(response.body.valid).toBe(false);
    });
  });
});
