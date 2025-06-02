// Jest setup file for ESM
import { jest } from '@jest/globals';

// Mock WebSocket for testing
jest.mock('ws', () => {
  return {
    WebSocketServer: jest.fn().mockImplementation(() => ({
      OPEN: 1,
      clients: new Set(),
    }))
  };
});

// Mock schema to avoid DB dependencies
jest.mock('./shared/schema.js', () => {
  return {
    insertAssetSchema: {
      parse: jest.fn().mockImplementation((data) => data),
    },
    insertWorkOrderSchema: {
      parse: jest.fn().mockImplementation((data) => data),
    },
    insertMaintenanceScheduleSchema: {
      parse: jest.fn().mockImplementation((data) => data),
    },
    insertNotificationSchema: {
      parse: jest.fn().mockImplementation((data) => data),
    },
    insertAssetSensorReadingSchema: {
      parse: jest.fn().mockImplementation((data) => data),
    }
  };
});
