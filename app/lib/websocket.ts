'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';

// Define the message types for type safety
export type WebSocketMessage = {
  type: 'SENSOR_UPDATE' | 'ASSET_STATUS' | 'ALERT' | 'WORK_ORDER_UPDATE' | 'NOTIFICATION';
  timestamp: string;
  data: any;
};

class WebSocketService {
  private socket: Socket | null = null;
  private callbacks: ((message: WebSocketMessage) => void)[] = [];
  private authData: { user_id: string; username: string; role: any } | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds

  connect() {
    if (this.socket && this.socket.connected) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('WebSocket connecting...');
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    this.socket = io(baseUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectInterval,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected with ID:', this.socket?.id);
      this.reconnectAttempts = 0;
      
      // Authenticate if auth data is available
      if (this.authData) {
        this.authenticate(this.authData);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Maximum WebSocket reconnection attempts reached');
      }
    });

    // Handle different event types
    this.socket.on('asset_update', (data) => {
      this.handleMessage({
        type: 'ASSET_STATUS',
        timestamp: new Date().toISOString(),
        data
      });
    });

    this.socket.on('sensor:reading', (data) => {
      this.handleMessage({
        type: 'SENSOR_UPDATE',
        timestamp: new Date().toISOString(),
        data
      });
    });

    this.socket.on('alert:new', (data) => {
      this.handleMessage({
        type: 'ALERT',
        timestamp: new Date().toISOString(),
        data
      });
    });

    this.socket.on('work_order_update', (data) => {
      this.handleMessage({
        type: 'WORK_ORDER_UPDATE',
        timestamp: new Date().toISOString(),
        data
      });
    });

    this.socket.on('notification', (data) => {
      this.handleMessage({
        type: 'NOTIFICATION',
        timestamp: new Date().toISOString(),
        data
      });
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    if (!this.socket) return;
    
    console.log('WebSocket disconnecting...');
    this.socket.disconnect();
    this.socket = null;
  }

  authenticate(userData: { user_id: string; username: string; role: any }) {
    if (!this.socket) {
      this.authData = userData;
      this.connect();
      return;
    }

    this.authData = userData;
    this.socket.emit('authenticate', userData);
    console.log('Authentication data sent:', userData);
  }

  subscribeToAsset(assetId: string) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot subscribe to asset - socket not connected');
      return;
    }
    
    this.socket.emit('subscribe:asset', assetId);
  }

  unsubscribeFromAsset(assetId: string) {
    if (!this.socket || !this.socket.connected) return;
    
    this.socket.emit('unsubscribe:asset', assetId);
  }

  subscribeToWorkOrder(workOrderId: string) {
    if (!this.socket || !this.socket.connected) return;
    
    this.socket.emit('subscribe:workOrder', workOrderId);
  }

  unsubscribeFromWorkOrder(workOrderId: string) {
    if (!this.socket || !this.socket.connected) return;
    
    this.socket.emit('unsubscribe:workOrder', workOrderId);
  }

  onMessage(callback: (message: WebSocketMessage) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  private handleMessage(message: WebSocketMessage) {
    console.log('WebSocket message received:', message);
    this.callbacks.forEach(callback => callback(message));
  }

  // For debugging purposes
  getConnectionStatus() {
    return {
      connected: this.socket?.connected || false,
      id: this.socket?.id || null,
      authData: this.authData
    };
  }
}

// Create singleton instance
export const wsService = new WebSocketService();

// React hook for using the WebSocket service
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  useEffect(() => {
    // Connect to WebSocket
    wsService.connect();
    setIsConnected(wsService.getConnectionStatus().connected);

    // Set up message listener
    const unsubscribe = wsService.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Return the necessary methods and state
  return {
    isConnected,
    messages,
    connect: wsService.connect.bind(wsService),
    disconnect: wsService.disconnect.bind(wsService),
    authenticate: wsService.authenticate.bind(wsService),
    subscribeToAsset: wsService.subscribeToAsset.bind(wsService),
    unsubscribeFromAsset: wsService.unsubscribeFromAsset.bind(wsService),
    subscribeToWorkOrder: wsService.subscribeToWorkOrder.bind(wsService),
    unsubscribeFromWorkOrder: wsService.unsubscribeFromWorkOrder.bind(wsService),
  };
}
