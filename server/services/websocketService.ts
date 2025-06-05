import WebSocket from 'ws';
import { subscribeToChannel, publishMessage } from '../redis';

interface WebSocketMessage {
  type: string;
  payload?: any;
  channel?: string;
  userId?: string;
  targetUsers?: string[];
}

let wss: WebSocket.Server;

// Redis channel prefixes
const GLOBAL_EVENTS_CHANNEL = 'events:global';
const ASSET_EVENTS_CHANNEL = 'events:assets';
const SENSOR_EVENTS_CHANNEL = 'events:sensors';
const CHAT_EVENTS_CHANNEL = 'events:chat';
const USER_EVENTS_PREFIX = 'events:user:';

// Client connections with metadata
const clients = new Map<WebSocket, { 
  userId?: string;
  subscriptions: Set<string>;
}>();

/**
 * Initialize WebSocket server and Redis pub/sub integration
 */
export const initializeWebSocketServer = (server: any): WebSocket.Server => {
  // Create WebSocket server
  wss = new WebSocket.Server({ 
    server, 
    path: '/ws' 
  });

  // Handle new connections
  wss.on('connection', handleConnection);

  // Subscribe to global events channel
  subscribeToRedisChannels();

  return wss;
};

/**
 * Handle new WebSocket connections
 */
const handleConnection = (ws: WebSocket, req: any) => {
  // Store client with empty metadata
  clients.set(ws, { 
    subscriptions: new Set([GLOBAL_EVENTS_CHANNEL]) 
  });

  // Handle client messages
  ws.on('message', (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      handleClientMessage(ws, message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    const clientData = clients.get(ws);
    if (clientData && clientData.userId) {
      // Broadcast user offline status if they were authenticated
      broadcastToAll({
        type: 'USER_OFFLINE',
        payload: { userId: clientData.userId }
      });
    }
    clients.delete(ws);
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({ 
    type: 'CONNECTION_ESTABLISHED',
    payload: { timestamp: new Date() }
  }));
};

/**
 * Handle client messages
 */
const handleClientMessage = async (ws: WebSocket, message: WebSocketMessage) => {
  const clientData = clients.get(ws);
  if (!clientData) return;

  switch (message.type) {
    case 'AUTHENTICATE':
      // Store user ID with connection
      if (message.userId) {
        clientData.userId = message.userId;
        
        // Subscribe to user-specific events
        const userChannel = `${USER_EVENTS_PREFIX}${message.userId}`;
        clientData.subscriptions.add(userChannel);
        
        // Broadcast user online status
        broadcastToAll({
          type: 'USER_ONLINE',
          payload: { userId: message.userId }
        });
      }
      break;

    case 'SUBSCRIBE':
      // Add channel to client subscriptions
      if (message.channel) {
        clientData.subscriptions.add(message.channel);
      }
      break;

    case 'UNSUBSCRIBE':
      // Remove channel from client subscriptions
      if (message.channel) {
        clientData.subscriptions.delete(message.channel);
      }
      break;

    case 'PUBLISH':
      // Publish message to Redis channel
      if (message.channel && message.payload) {
        await publishMessage(message.channel, {
          ...message.payload,
          userId: clientData.userId
        });
      }
      break;

    case 'DIRECT_MESSAGE':
      // Send message to specific users
      if (message.targetUsers && message.targetUsers.length > 0) {
        for (const userId of message.targetUsers) {
          await publishMessage(`${USER_EVENTS_PREFIX}${userId}`, {
            type: 'DIRECT_MESSAGE',
            payload: message.payload,
            from: clientData.userId
          });
        }
      }
      break;

    default:
      // Forward other message types to appropriate channels
      if (message.channel) {
        await publishMessage(message.channel, message);
      }
  }
};

/**
 * Subscribe to Redis channels and forward messages to WebSocket clients
 */
const subscribeToRedisChannels = async () => {
  // Global events channel
  await subscribeToChannel(GLOBAL_EVENTS_CHANNEL, (message) => {
    broadcastToAll(message);
  });

  // Asset events channel
  await subscribeToChannel(ASSET_EVENTS_CHANNEL, (message) => {
    broadcastToAll(message);
  });

  // Sensor events channel
  await subscribeToChannel(SENSOR_EVENTS_CHANNEL, (message) => {
    broadcastToAll(message);
  });

  // Chat events channel
  await subscribeToChannel(CHAT_EVENTS_CHANNEL, (message) => {
    broadcastToAll(message);
  });

  // User-specific events are handled through the handleRedisMessage function
  // which checks if any connected clients are subscribed to the incoming channel
};

/**
 * Broadcast message to all connected clients
 */
export const broadcastToAll = (message: any) => {
  if (!wss) return;
  
  const data = JSON.stringify(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

/**
 * Broadcast message to specific clients by user ID
 */
export const broadcastToUsers = (userIds: string[], message: any) => {
  if (!wss) return;
  
  const data = JSON.stringify(message);
  
  clients.forEach((clientData, client) => {
    if (client.readyState === WebSocket.OPEN && 
        clientData.userId && 
        userIds.includes(clientData.userId)) {
      client.send(data);
    }
  });
};

/**
 * Broadcast message to clients subscribed to a specific channel
 */
export const broadcastToChannel = (channel: string, message: any) => {
  if (!wss) return;
  
  const data = JSON.stringify(message);
  
  clients.forEach((clientData, client) => {
    if (client.readyState === WebSocket.OPEN && 
        clientData.subscriptions.has(channel)) {
      client.send(data);
    }
  });
};

/**
 * Publish a message to a Redis channel
 */
export const publishToChannel = async (channel: string, message: any) => {
  await publishMessage(channel, message);
};

export default {
  initializeWebSocketServer,
  broadcastToAll,
  broadcastToUsers,
  broadcastToChannel,
  publishToChannel
};
