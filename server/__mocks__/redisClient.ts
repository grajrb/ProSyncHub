// Mock for redisClient.ts
import { jest } from '@jest/globals';

// Create a comprehensive mock Redis client
export const redisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  off: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  flushDb: jest.fn().mockResolvedValue('OK'),
  publish: jest.fn().mockResolvedValue(1),
  subscribe: jest.fn().mockResolvedValue(undefined),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  duplicate: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockImplementation((channel, callback) => {
      // Simulate a callback with a test message
      setTimeout(() => callback('{"test":"data"}'), 10);
      return Promise.resolve();
    }),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
  }),
};
