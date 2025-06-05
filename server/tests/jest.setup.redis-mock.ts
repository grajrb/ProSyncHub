// Jest setup file to mock Redis for all tests
import { jest } from '@jest/globals';

// Create a comprehensive mock Redis client
const mockRedisClient = {
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
    subscribe: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined)
  }),
};

// Mock the Redis client module
jest.mock('../redisClient', () => ({
  redisClient: mockRedisClient
}));

// Mock the Redis functions
jest.mock('../redis', () => ({
  getCache: jest.fn().mockImplementation(async (key) => {
    console.log(`Mock getCache called with key: ${key}`);
    return null;
  }),
  setCache: jest.fn().mockImplementation(async (key, value) => {
    console.log(`Mock setCache called with key: ${key}, value: ${value}`);
    return 'OK';
  }),
  deleteCache: jest.fn().mockImplementation(async (key) => {
    console.log(`Mock deleteCache called with key: ${key}`);
    return 1;
  }),
  publishMessage: jest.fn().mockImplementation(async (channel, message) => {
    console.log(`Mock publishMessage called for channel: ${channel}`);
    return 1;
  }),
  subscribeToChannel: jest.fn().mockImplementation(async (channel, callback) => {
    console.log(`Mock subscribeToChannel called for channel: ${channel}`);
    // Simulate a message immediately for testing
    setTimeout(() => callback('{"test":"data"}'), 10);
    return;
  })
}));

// Mock connect-redis with a fully functional RedisStore implementation
jest.mock('connect-redis', () => {
  class MockRedisStore {
    constructor(_options: any) {
      // Return a store with all the methods we need
      return {
        get: jest.fn().mockImplementation((sid, callback) => {
          callback(null, { cookie: {}, user: { id: 'mock-user-id' } });
        }),
        set: jest.fn().mockImplementation((sid, session, callback) => {
          callback(null, 'OK');
        }),
        destroy: jest.fn().mockImplementation((sid, callback) => {
          callback(null, 'OK');
        }),
        touch: jest.fn().mockImplementation((sid, session, callback) => {
          callback(null, 'OK');
        }),
        all: jest.fn().mockImplementation((callback) => {
          callback(null, []);
        }),
        clear: jest.fn().mockImplementation((callback) => {
          callback(null, 'OK');
        }),
      };
    }
  }
  
  return {
    RedisStore: MockRedisStore
  };
});
