/**
 * Integration tests for sensor data and predictive maintenance services
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectToMongoDB, disconnectFromMongoDB } from '../mongodb';
import sensorRoutes from '../routes/sensorRoutes';
import { sensorDataService } from '../services';
import AssetSensorData from '../models/AssetSensorData';

// Mock JWT middleware
jest.mock('../authMiddleware.ts', () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => next(),
  authorizeRoles: (..._roles: string[]) => (_req: any, _res: any, next: any) => next(),
  AuthRequest: jest.fn()
}));

// Mock RBAC middleware
jest.mock('../rbac.ts', () => ({
  requirePermission: (_resource: string, _action: string) => (_req: any, _res: any, next: any) => next(),
  requirePermissionAuto: () => (_req: any, _res: any, next: any) => next(),
  requireRoles: (..._roles: string[]) => (_req: any, _res: any, next: any) => next()
}));

// Sample test data
const mockAssetId = 'test-asset-123';
const mockSensorId = 'test-sensor-123';
const mockSensorType = 'temperature';
const mockUnit = '°C';
const mockValue = 25.5;

// Sample batch data
const mockBatchData = {
  assetId: mockAssetId,
  sensorId: mockSensorId,
  sensorType: mockSensorType,
  unit: mockUnit,
  readings: [
    { timestamp: new Date().toISOString(), value: 24.5 },
    { timestamp: new Date(Date.now() - 3600000).toISOString(), value: 25.0 },
    { timestamp: new Date(Date.now() - 7200000).toISOString(), value: 25.5 }
  ]
};

describe('Sensor Data API Integration Tests', () => {
  let app: express.Application;
  
  beforeAll(async () => {
    // Connect to test MongoDB instance
    await connectToMongoDB();
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/sensors', sensorRoutes);
  });
  
  afterAll(async () => {
    // Clean up test data
    await AssetSensorData.deleteMany({ assetId: mockAssetId });
    
    // Disconnect MongoDB
    await disconnectFromMongoDB();
  });
  
  // Clear data between tests
  afterEach(async () => {
    await AssetSensorData.deleteMany({ assetId: mockAssetId });
  });
  
  test('POST /api/sensors/data should add a new sensor reading', async () => {
    const response = await request(app)
      .post('/api/sensors/data')
      .send({
        assetId: mockAssetId,
        sensorId: mockSensorId,
        sensorType: mockSensorType,
        value: mockValue,
        unit: mockUnit
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('assetId', mockAssetId);
    expect(response.body).toHaveProperty('sensorId', mockSensorId);
    expect(response.body).toHaveProperty('value', mockValue);
    
    // Verify it was saved to database
    const savedReading = await AssetSensorData.findOne({ 
      assetId: mockAssetId, 
      sensorId: mockSensorId 
    });
    
    expect(savedReading).not.toBeNull();
    expect(savedReading?.value).toBe(mockValue);
  });
  
  test('POST /api/sensors/batch should ingest multiple sensor readings', async () => {
    const response = await request(app)
      .post('/api/sensors/batch')
      .send(mockBatchData);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('count', mockBatchData.readings.length);
    
    // Verify all readings were saved
    const savedReadings = await AssetSensorData.find({ 
      assetId: mockAssetId, 
      sensorId: mockSensorId 
    });
    
    expect(savedReadings.length).toBe(mockBatchData.readings.length);
  });
  
  test('GET /api/sensors should return sensor data with filtering', async () => {
    // Add test data first
    await request(app)
      .post('/api/sensors/batch')
      .send(mockBatchData);
    
    const response = await request(app)
      .get('/api/sensors')
      .query({ 
        assetId: mockAssetId,
        sensorId: mockSensorId
      });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(mockBatchData.readings.length);
    
    // Verify the data is correct
    response.body.forEach((reading: any) => {
      expect(reading.assetId).toBe(mockAssetId);
      expect(reading.sensorId).toBe(mockSensorId);
      expect(reading.sensorType).toBe(mockSensorType);
    });
  });
  
  test('GET /api/sensors/latest should return the latest sensor reading', async () => {
    // Add test data first
    await request(app)
      .post('/api/sensors/batch')
      .send(mockBatchData);
    
    const response = await request(app)
      .get('/api/sensors/latest')
      .query({ 
        assetId: mockAssetId,
        sensorId: mockSensorId
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('assetId', mockAssetId);
    expect(response.body).toHaveProperty('sensorId', mockSensorId);
    
    // Should be the most recent reading
    const latestTimestamp = new Date(response.body.timestamp).getTime();
    const allTimestamps = mockBatchData.readings.map(r => new Date(r.timestamp).getTime());
    const expectedLatest = Math.max(...allTimestamps);
    
    expect(latestTimestamp).toBe(expectedLatest);
  });
  
  test('GET /api/sensors/stats should return statistics for sensor data', async () => {
    // Add test data first
    await request(app)
      .post('/api/sensors/batch')
      .send(mockBatchData);
    
    const response = await request(app)
      .get('/api/sensors/stats')
      .query({ 
        assetId: mockAssetId,
        sensorId: mockSensorId
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('min');
    expect(response.body).toHaveProperty('max');
    expect(response.body).toHaveProperty('avg');
    expect(response.body).toHaveProperty('count');
    
    // Verify stats are correct
    const values = mockBatchData.readings.map(r => r.value);
    const expectedMin = Math.min(...values);
    const expectedMax = Math.max(...values);
    const expectedAvg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    expect(response.body.min).toBe(expectedMin);
    expect(response.body.max).toBe(expectedMax);
    expect(response.body.avg).toBeCloseTo(expectedAvg, 5);
    expect(response.body.count).toBe(values.length);
  });
  
  test('GET /api/sensors/predictions should return predictive maintenance forecasts', async () => {
    // Add test data first
    await request(app)
      .post('/api/sensors/batch')
      .send(mockBatchData);
    
    const response = await request(app)
      .get('/api/sensors/predictions')
      .query({ 
        assetId: mockAssetId,
        sensorId: mockSensorId,
        model: 'linear'
      });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    if (response.body.length > 0) {
      const prediction = response.body[0];
      expect(prediction).toHaveProperty('assetId', mockAssetId);
      expect(prediction).toHaveProperty('sensorId', mockSensorId);
      expect(prediction).toHaveProperty('predictionType');
      expect(prediction).toHaveProperty('currentValue');
      expect(prediction).toHaveProperty('recommendations');
    }
  });
  
  test('GET /api/sensors/analytics should return time series analytics', async () => {
    // Add test data first
    await request(app)
      .post('/api/sensors/batch')
      .send(mockBatchData);
    
    const response = await request(app)
      .get('/api/sensors/analytics')
      .query({ 
        assetId: mockAssetId,
        interval: 'hour',
        aggregation: 'avg'
      });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    if (response.body.length > 0) {
      const analytics = response.body[0];
      expect(analytics).toHaveProperty('assetId', mockAssetId);
      expect(analytics).toHaveProperty('sensorType');
      expect(analytics).toHaveProperty('timeRange');
      expect(analytics).toHaveProperty('dataPoints');
      expect(analytics).toHaveProperty('summary');
      
      // Verify the summary has expected properties
      expect(analytics.summary).toHaveProperty('min');
      expect(analytics.summary).toHaveProperty('max');
      expect(analytics.summary).toHaveProperty('avg');
      expect(analytics.summary).toHaveProperty('trend');
    }
  });
});
