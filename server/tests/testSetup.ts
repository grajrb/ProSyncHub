// Global Jest test setup file for ProSyncHub
import { jest } from '@jest/globals';

// Set up global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/prosync-hub-test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  
  // Increase Jest timeout for slower tests
  jest.setTimeout(10000);
  
  // Suppress console output during tests to keep the output clean
  // Comment these out if you need to debug test failures
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  // Keep error logging enabled for debugging
  // jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Clean up after all tests
afterAll(() => {
  // Restore console functions
  jest.restoreAllMocks();
});