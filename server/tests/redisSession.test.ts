import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { redisClient } from '../redisClient';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { connectToMongoDB, disconnectFromMongoDB } from '../mongodb';
import User from '../models/User';

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
const SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

describe('Redis Session Management', () => {
  let app: express.Application;
  let redisStore: RedisStore;
  
  // Mock user data
  const mockUser = {
    email: `test-${uuidv4()}@example.com`,
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'user'
  };
  
  // JWT token for the mock user
  let authToken: string;
  let userId: string;
  
  beforeAll(async () => {
    // Connect to Redis
    await redisClient.connect();
    
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Create mock user in database
    const user = new User(mockUser);
    await user.save();
    userId = (user._id as string);
    
    // Generate JWT token
    authToken = jwt.sign(
      { id: userId, email: mockUser.email, role: mockUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
      // Initialize Redis store
    redisStore = new RedisStore({
      client: redisClient
    });
    
    // Set up Express app with Redis session
    app = express();
    
    app.use(express.json());
    
    // Configure session middleware
    app.use(session({
      store: redisStore,
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 day
      }
    }));
    
    // Test routes
    app.post('/api/login', (req, res) => {
      const { email, password } = req.body;
      
      if (email === mockUser.email && password === mockUser.password) {
        // Set user data in session
        req.session.user = {
          id: userId,
          email: mockUser.email,
          role: mockUser.role
        };
        
        // Save session
        req.session.save((err) => {
          if (err) {
            return res.status(500).json({ message: 'Error saving session', error: err.message });
          }
          
          // Return JWT token and session ID
          res.json({
            token: authToken,
            sessionId: req.session.id,
            user: {
              id: userId,
              email: mockUser.email,
              role: mockUser.role
            }
          });
        });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    });
    
    app.get('/api/session-data', (req, res) => {
      if (req.session.user) {
        res.json({ user: req.session.user });
      } else {
        res.status(401).json({ message: 'No active session' });
      }
    });
    
    app.post('/api/logout', (req, res) => {
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: 'Error destroying session', error: err.message });
        }
        
        // Blacklist JWT token
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
          const decoded = jwt.decode(token) as { exp: number };
          const expiry = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;
          
          redisClient.set(`blacklist:${token}`, '1', { EX: expiry })
            .then(() => {
              res.json({ message: 'Logged out successfully' });
            })
            .catch((redisErr) => {
              console.error('Error blacklisting token:', redisErr);
              res.status(500).json({ message: 'Error during logout', error: redisErr.message });
            });
        } else {
          res.json({ message: 'Logged out successfully' });
        }
      });
    });
    
    app.get('/api/protected', async (req, res) => {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
      
      try {
        // Check if token is blacklisted
        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        
        if (isBlacklisted) {
          return res.status(401).json({ message: 'Token is blacklisted' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ message: 'Access granted', user: decoded });
      } catch (error) {
        res.status(401).json({ message: 'Invalid token', error: (error as Error).message });
      }
    });
  });
    afterAll(async () => {
    // Clean up
    if (mongoose.connection.readyState === 1) {
      try {
        await User.deleteMany({ email: mockUser.email });
      } catch (err) {
        console.log('Error cleaning up User model in afterAll:', err);
      }
    }
    
    // Close Redis store
    try {
      redisStore.close();
    } catch (err) {
      console.log('Error closing Redis store:', err);
    }
    
    // Disconnect from Redis and MongoDB
    await redisClient.quit();
    await disconnectFromMongoDB();
  });
  
  test('should create a session on login', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        email: mockUser.email,
        password: mockUser.password
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('sessionId');
    
    // Verify the session was stored in Redis
    const sessionId = response.body.sessionId;
    const sessionData = await redisClient.get(`session:${sessionId}`);
    
    expect(sessionData).toBeTruthy();
  });
  
  test('should retrieve session data', async () => {
    // First login to create a session
    const loginResponse = await request(app)
      .post('/api/login')
      .send({
        email: mockUser.email,
        password: mockUser.password
      });
    
    expect(loginResponse.status).toBe(200);
    
    // Get the session cookie
    const cookies = loginResponse.headers['set-cookie'];
    
    // Retrieve session data
    const response = await request(app)
      .get('/api/session-data')
      .set('Cookie', cookies);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', mockUser.email);
  });
  
  test('should blacklist JWT token on logout', async () => {
    // First login to create a session and get token
    const loginResponse = await request(app)
      .post('/api/login')
      .send({
        email: mockUser.email,
        password: mockUser.password
      });
    
    expect(loginResponse.status).toBe(200);
    
    const token = loginResponse.body.token;
    const cookies = loginResponse.headers['set-cookie'];
    
    // Logout and blacklist token
    const logoutResponse = await request(app)
      .post('/api/logout')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', cookies);
    
    expect(logoutResponse.status).toBe(200);
    
    // Try to access protected route with blacklisted token
    const protectedResponse = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`);
    
    expect(protectedResponse.status).toBe(401);
    expect(protectedResponse.body).toHaveProperty('message', 'Token is blacklisted');
  });
  
  test('should prevent access to protected routes after session destruction', async () => {
    // First login to create a session
    const loginResponse = await request(app)
      .post('/api/login')
      .send({
        email: mockUser.email,
        password: mockUser.password
      });
    
    expect(loginResponse.status).toBe(200);
    
    const cookies = loginResponse.headers['set-cookie'];
    
    // Access session data before logout
    const beforeLogoutResponse = await request(app)
      .get('/api/session-data')
      .set('Cookie', cookies);
    
    expect(beforeLogoutResponse.status).toBe(200);
    
    // Logout
    await request(app)
      .post('/api/logout')
      .set('Cookie', cookies);
    
    // Try to access session data after logout
    const afterLogoutResponse = await request(app)
      .get('/api/session-data')
      .set('Cookie', cookies);
    
    expect(afterLogoutResponse.status).toBe(401);
  });
});
