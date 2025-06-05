// Jest setup file to mock MongoDB for all tests
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { jest } from '@jest/globals';
import { mock } from 'jest-mock-extended';

// Variable to hold the MongoDB memory server instance
let mongoServer: MongoMemoryServer;

// Setup before all tests
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = await mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(uri);
    console.log('Connected to the in-memory database');
  } catch (error) {
    console.error('Error setting up MongoDB memory server:', error);
    throw error;
  }
});

// Clean up after all tests are done
afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error cleaning up MongoDB memory server:', error);
  }
});

// Clear all collections after each test
afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      try {
        const collection = collections[key];
        await collection.deleteMany({});
      } catch (error) {
        console.error(`Error clearing collection ${key}:`, error);
      }
    }
  }
});

// Mock mongoose methods for the models
jest.mock('../models/AssetSensorData', () => {
  const mockModel = {
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    create: jest.fn(),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    }),
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    }),
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    }),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 })
  };
  
  return mockModel;
});

// Mock the MongoDB functions from mongodb.ts
jest.mock('../mongodb', () => {
  return {
    connectToMongoDB: jest.fn().mockResolvedValue(undefined),
    disconnectFromMongoDB: jest.fn().mockResolvedValue(undefined),
  };
});
