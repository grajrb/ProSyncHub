// Mock for WebSocket for testing
import { jest } from '@jest/globals';

const mockWebSocketServer = {
  OPEN: 1,
  clients: new Set(),
};

export class WebSocketServer {
  constructor() {
    return mockWebSocketServer;
  }
}

export default {
  WebSocketServer
};
