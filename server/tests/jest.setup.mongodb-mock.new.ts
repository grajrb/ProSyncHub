// Jest setup file to mock MongoDB for all tests
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { jest } from '@jest/globals';

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

// Mock the MongoDB functions from mongodb.ts
jest.mock('../mongodb', () => {
  return {
    connectToMongoDB: jest.fn().mockReturnValue(undefined),
    disconnectFromMongoDB: jest.fn().mockReturnValue(undefined),
  };
});

// Mock the models
jest.mock('../models', () => {
  return {
    AssetSensorData: require('../__mocks__/AssetSensorData').default,
    ChatMessage: require('../__mocks__/ChatMessage').default,
    EventLog: require('../__mocks__/EventLog').default,
    Checklist: require('../__mocks__/Checklist').default,
  };
});

// Mock individual models
jest.mock('../models/AssetSensorData', () => require('../__mocks__/AssetSensorData').default);
jest.mock('../models/User', () => require('../__mocks__/User').default);
