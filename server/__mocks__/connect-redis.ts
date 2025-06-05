// Mock implementation for connect-redis
import { jest } from '@jest/globals';

const sessionMock = {
  user: { id: 'test-user-id', email: 'test@example.com', role: 'user' },
};

export class RedisStore {
  constructor(options: any) {
    // Return a store with all the methods we need
    return {
      get: jest.fn().mockImplementation((sid, callback) => {
        callback(null, sessionMock);
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
      close: jest.fn(),
    };
  }
}
