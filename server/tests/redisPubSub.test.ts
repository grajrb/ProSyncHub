import WebSocket, { Server as WebSocketServer } from 'ws';
import { Server } from 'http';
import express from 'express';
import mongoose from 'mongoose';
import { connectToMongoDB, disconnectFromMongoDB } from '../mongodb';
import { publishMessage, subscribeToChannel } from '../redis';
import { redisClient } from '../redisClient';
import websocketService from '../services/websocketService';
import { sensorDataService } from '../services';
import AssetSensorData from '../models/AssetSensorData';

describe('Redis Pub/Sub with WebSocket Integration', () => {
  let app: express.Application;
  let server: Server;
  let wss: WebSocketServer;
  let wsUrl: string;
  
  beforeAll(async () => {
    // Connect to test MongoDB instance
    await connectToMongoDB();
    
    // Connect to Redis
    await redisClient.connect();
    
    // Set up Express app and server
    app = express();
    app.use(express.json());
    
    server = app.listen(0); // Use random available port
    const port = (server.address() as any).port;
    wsUrl = `ws://localhost:${port}/ws`;
    
    // Initialize WebSocket server
    wss = websocketService.initializeWebSocketServer(server);
  });
    afterAll(async () => {
    // Clean up data
    if (mongoose.connection.readyState === 1) {
      // Only try to delete if we're connected
      try {
        await AssetSensorData.deleteMany({});
      } catch (err) {
        console.log('Error cleaning up AssetSensorData:', err);
      }
    }
    
    // Close WebSocket server and connections
    wss.close();
    server.close();
    
    // Disconnect from Redis and MongoDB
    await redisClient.quit();
    await disconnectFromMongoDB();
  });
  beforeEach(async () => {
    // Clean up before each test
    if (mongoose.connection.readyState === 1) {
      try {
        await AssetSensorData.deleteMany({});
      } catch (err) {
        console.log('Error cleaning up AssetSensorData in beforeEach:', err);
      }
    }
  });
  
  /**
   * Helper function to create a WebSocket client and wait for connection
   */
  const createWsClient = (): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(wsUrl);
      
      client.on('open', () => resolve(client));
      client.on('error', (error) => reject(error));
      
      // Set timeout in case connection hangs
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    });
  };
  
  /**
   * Helper function to wait for a message from the WebSocket
   */
  const waitForWsMessage = (client: WebSocket): Promise<any> => {
    return new Promise((resolve) => {
      client.once('message', (data) => {
        const message = JSON.parse(data.toString());
        resolve(message);
      });
    });
  };
  
  test('should receive initial connection confirmation', async () => {
    const client = await createWsClient();
    const message = await waitForWsMessage(client);
    
    expect(message.type).toBe('CONNECTION_ESTABLISHED');
    expect(message.payload).toHaveProperty('timestamp');
    
    client.close();
  });
  
  test('should receive real-time updates when sensor data is added', async () => {
    // Create WebSocket client and wait for connection
    const client = await createWsClient();
    await waitForWsMessage(client); // Skip the initial connection message
    
    // Subscribe client to sensor events channel
    client.send(JSON.stringify({
      type: 'SUBSCRIBE',
      channel: 'events:sensors'
    }));
    
    // Add sensor reading that should trigger a Redis pub/sub message
    const sensorData = {
      assetId: 'test-asset-1',
      sensorId: 'test-sensor-1',
      sensorType: 'temperature',
      value: 25.5,
      unit: '°C',
      status: 'normal',
      timestamp: new Date()
    };
    // Add new sensor reading
    await sensorDataService.addSensorReading(sensorData as any);
    
    // Wait for WebSocket message with the update
    const message = await waitForWsMessage(client);
    
    // Verify the message
    expect(message.type).toBe('SENSOR_DATA_UPDATED');
    expect(message.payload).toHaveProperty('assetId', sensorData.assetId);
    expect(message.payload).toHaveProperty('sensorId', sensorData.sensorId);
    
    client.close();
  });
  
  test('should receive messages on user-specific channels', async () => {
    // Create WebSocket client and wait for connection
    const client = await createWsClient();
    await waitForWsMessage(client); // Skip the initial connection message
    
    // Authenticate client with user ID
    const userId = 'test-user-123';
    client.send(JSON.stringify({
      type: 'AUTHENTICATE',
      userId
    }));
    
    // Wait for USER_ONLINE message
    await waitForWsMessage(client);
    
    // Publish a direct message to the user's channel
    const directMessage = {
      type: 'DIRECT_MESSAGE',
      payload: {
        message: 'Test direct message'
      }
    };
    
    await publishMessage(`events:user:${userId}`, directMessage);
    
    // Wait for the direct message
    const message = await waitForWsMessage(client);
    
    // Verify the message
    expect(message.type).toBe('DIRECT_MESSAGE');
    expect(message.payload).toHaveProperty('message', 'Test direct message');
    
    client.close();
  });
  
  test('should broadcast asset updates to all subscribed clients', async () => {
    // Create two WebSocket clients
    const client1 = await createWsClient();
    const client2 = await createWsClient();
    
    // Skip initial connection messages
    await waitForWsMessage(client1);
    await waitForWsMessage(client2);
    
    // Subscribe both clients to asset events channel
    client1.send(JSON.stringify({
      type: 'SUBSCRIBE',
      channel: 'events:assets'
    }));
    
    client2.send(JSON.stringify({
      type: 'SUBSCRIBE',
      channel: 'events:assets'
    }));
    
    // Publish an asset update
    const assetUpdate = {
      type: 'ASSET_UPDATED',
      payload: {
        assetId: 'test-asset-1',
        status: 'maintenance'
      }
    };
    
    await publishMessage('events:assets', assetUpdate);
    
    // Wait for both clients to receive the update
    const [message1, message2] = await Promise.all([
      waitForWsMessage(client1),
      waitForWsMessage(client2)
    ]);
    
    // Verify the messages
    expect(message1.type).toBe('ASSET_UPDATED');
    expect(message1.payload.assetId).toBe('test-asset-1');
    
    expect(message2.type).toBe('ASSET_UPDATED');
    expect(message2.payload.assetId).toBe('test-asset-1');
    
    client1.close();
    client2.close();
  });
});
