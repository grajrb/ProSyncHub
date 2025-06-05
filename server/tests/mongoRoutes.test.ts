import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import { connectToMongoDB, disconnectFromMongoDB } from '../mongodb';
import mongoRoutes from '../routes/mongoRoutes';
import AssetSensorData from '../models/AssetSensorData';
import { ChatMessage, EventLog, Checklist } from '../models';
import jwt from 'jsonwebtoken';

// Mock JWT middleware
jest.mock('../authMiddleware.ts', () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => next(),
  authorizeRoles: (..._roles: string[]) => (_req: any, _res: any, next: any) => next(),
  AuthRequest: jest.fn()
}));

// Mock data
const mockSensorData = {
  assetId: 'test-asset-1',
  sensorId: 'test-sensor-1',
  sensorType: 'temperature',
  value: 25.5,
  unit: '°C',
  status: 'normal'
};

const mockEventLog = {
  eventType: 'system',
  severity: 'info',
  source: 'test',
  message: 'Test event log'
};

const mockChecklist = {
  title: 'Test Checklist',
  type: 'maintenance',
  status: 'active',
  priority: 'medium',
  items: [
    { title: 'Test Item 1', isCompleted: false },
    { title: 'Test Item 2', isCompleted: false }
  ],
  createdBy: 'test-user'
};

const mockChatMessage = {
  userId: 'test-user',
  username: 'Test User',
  message: 'Test message',
  roomId: 'test-room'
};

describe('MongoDB API Routes', () => {
  let app: express.Application;
  let mongoServer: any;

  beforeAll(async () => {
    // Connect to test MongoDB instance
    await connectToMongoDB();
    
    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/mongo', mongoRoutes);
  });  afterAll(async () => {
    // Clean up and disconnect
    if (mongoose.connection.readyState === 1) {
      try {
        await Promise.all([
          AssetSensorData.deleteMany({}),
          EventLog.deleteMany({}),
          Checklist.deleteMany({}),
          ChatMessage.deleteMany({})
        ]);
      } catch (err) {
        console.log('Error cleaning up models in afterAll:', err);
      }
    }
    
    await disconnectFromMongoDB();
  });
  // Clean up after each test
  afterEach(async () => {
    try {
      await Promise.all([
        AssetSensorData.deleteMany({}),
        EventLog.deleteMany({}),
        Checklist.deleteMany({}),
        ChatMessage.deleteMany({})
      ]);
    } catch (err) {
      console.log('Error cleaning up in afterEach:', err);
    }
  });

  describe('Sensor Data Endpoints', () => {
    it('should create a new sensor reading', async () => {
      const response = await request(app)
        .post('/api/mongo/sensor-data')
        .send(mockSensorData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.assetId).toBe(mockSensorData.assetId);
      expect(response.body.value).toBe(mockSensorData.value);
    });

    it('should get sensor data with filtering', async () => {
      // Create test data
      await AssetSensorData.create(mockSensorData);
      
      const response = await request(app)
        .get('/api/mongo/sensor-data')
        .query({ assetId: mockSensorData.assetId });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].assetId).toBe(mockSensorData.assetId);
    });

    it('should get latest sensor readings', async () => {
      // Create test data
      await AssetSensorData.create(mockSensorData);
      
      const response = await request(app)
        .get(`/api/mongo/sensor-data/latest/${mockSensorData.assetId}`);

      expect(response.status).toBe(200);
      expect(response.body.assetId).toBe(mockSensorData.assetId);
    });
  });

  describe('Event Log Endpoints', () => {
    it('should create a new event log', async () => {
      const response = await request(app)
        .post('/api/mongo/event-logs')
        .send(mockEventLog);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.eventType).toBe(mockEventLog.eventType);
      expect(response.body.message).toBe(mockEventLog.message);
    });

    it('should get event logs with filtering', async () => {
      // Create test data
      await EventLog.create(mockEventLog);
      
      const response = await request(app)
        .get('/api/mongo/event-logs')
        .query({ eventType: mockEventLog.eventType });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].eventType).toBe(mockEventLog.eventType);
    });

    it('should acknowledge an event log', async () => {
      // Create test data
      const eventLog = await EventLog.create(mockEventLog);
      
      const response = await request(app)
        .post(`/api/mongo/event-logs/${eventLog._id}/acknowledge`);

      expect(response.status).toBe(200);
      expect(response.body.acknowledged).toBe(true);
      expect(response.body).toHaveProperty('acknowledgedAt');
    });
  });

  describe('Checklist Endpoints', () => {
    it('should create a new checklist', async () => {
      const response = await request(app)
        .post('/api/mongo/checklists')
        .send(mockChecklist);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(mockChecklist.title);
      expect(response.body.items.length).toBe(mockChecklist.items.length);
    });

    it('should get checklists with filtering', async () => {
      // Create test data
      await Checklist.create(mockChecklist);
      
      const response = await request(app)
        .get('/api/mongo/checklists')
        .query({ type: mockChecklist.type });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].type).toBe(mockChecklist.type);
    });

    it('should add an item to a checklist', async () => {
      // Create test data
      const checklist = await Checklist.create(mockChecklist);
      
      const newItem = { title: 'New Test Item' };
      
      const response = await request(app)
        .post(`/api/mongo/checklists/${checklist._id}/items`)
        .send(newItem);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBe(mockChecklist.items.length + 1);
      expect(response.body.items[mockChecklist.items.length].title).toBe(newItem.title);
    });
  });

  describe('Chat Message Endpoints', () => {
    it('should send a new chat message', async () => {
      const response = await request(app)
        .post('/api/mongo/chat/messages')
        .send(mockChatMessage);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.message).toBe(mockChatMessage.message);
      expect(response.body.roomId).toBe(mockChatMessage.roomId);
    });

    it('should get messages for a room', async () => {
      // Create test data
      await ChatMessage.create(mockChatMessage);
      
      const response = await request(app)
        .get(`/api/mongo/chat/messages/${mockChatMessage.roomId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].roomId).toBe(mockChatMessage.roomId);
    });

    it('should mark messages as read', async () => {
      // Create test data
      const message = await ChatMessage.create({
        ...mockChatMessage,
        readBy: []
      });
      
      const response = await request(app)
        .post(`/api/mongo/chat/messages/${mockChatMessage.roomId}/read`)
        .send({ messageIds: [message._id] });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      
      // Verify message was marked as read
      const updatedMessage = await ChatMessage.findById(message._id);
      expect(updatedMessage?.readBy.length).toBeGreaterThan(0);
    });
  });
});
