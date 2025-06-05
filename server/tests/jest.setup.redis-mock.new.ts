// Jest setup file to mock Redis for all tests
import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Create a Redis client mock with all needed methods
const createMockRedisClient = () => {
  const store = new Map<string, string>();
  const pubsubEmitter = new EventEmitter();
  
  return {
    connect: jest.fn<() => Promise<undefined>>().mockResolvedValue(undefined),
    quit: jest.fn<() => Promise<undefined>>().mockResolvedValue(undefined),
    disconnect: jest.fn<() => Promise<undefined>>().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    
    // Key-value operations
    get: jest.fn((key: string) => {
      return Promise.resolve(store.get(key) || null);
    }),
    set: jest.fn((key: string, value: string, options?: any) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string | string[]) => {
      if (Array.isArray(key)) {
        let count = 0;
        key.forEach(k => {
          if (store.delete(k)) count++;
        });
        return Promise.resolve(count);
      } else {
        const result = store.delete(key) ? 1 : 0;
        return Promise.resolve(result);
      }
    }),
    keys: jest.fn((pattern: string) => {
      // Simple glob pattern matching (just for testing purposes)
      const keys = Array.from(store.keys());
      const regex = new RegExp(pattern.replace('*', '.*'));
      return Promise.resolve(keys.filter((k: string) => regex.test(k)));
    }),
    flushDb: jest.fn(() => {
      store.clear();
      return Promise.resolve('OK');
    }),
    
    // Pub/Sub operations
    publish: jest.fn((channel: string, message: string) => {
      pubsubEmitter.emit(channel, message);
      return Promise.resolve(1);
    }),
    subscribe: jest.fn((channel: string, callback: (message: string) => void) => {
      pubsubEmitter.on(channel, callback);
      return Promise.resolve(undefined);
    }),
    unsubscribe: jest.fn((channel: string) => {
      pubsubEmitter.removeAllListeners(channel);
      return Promise.resolve(undefined);
    }),
    
    // Client duplication
    duplicate: jest.fn(() => {
      const duplicate = createMockRedisClient();
      return duplicate;
    }),
  };
};

// Create the mock client
const mockRedisClient = createMockRedisClient();

// Mock the Redis client module
jest.mock('../redisClient', () => ({
  redisClient: mockRedisClient,
  default: mockRedisClient
}));

// Mock isTokenBlacklisted function
jest.mock('../redis', () => {
  const originalModule = jest.requireActual('../redis');
  const originalObj = (typeof originalModule === 'object' && originalModule !== null) ? originalModule : {};

  return {
    ...originalObj,
    getCache: jest.fn().mockImplementation(async (key) => {
      return null;
    }),
    setCache: jest.fn().mockImplementation(async (key, value) => {
      return 'OK';
    }),
    deleteCache: jest.fn().mockImplementation(async (key) => {
      return true;
    }),
    clearCache: jest.fn().mockImplementation(async (prefix) => {
      return 0;
    }),
    isTokenBlacklisted: jest.fn().mockImplementation(async () => false),
    publishMessage: jest.fn().mockImplementation(async () => undefined),
    subscribeToChannel: jest.fn().mockImplementation(async () => undefined),
  };
});

// Export for tests that need to access the mock directly
export const redisClientMock = mockRedisClient;