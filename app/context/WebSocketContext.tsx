'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { wsService, WebSocketMessage } from '@/app/lib/websocket';

// Define the context type
interface WebSocketContextType {
  isConnected: boolean;
  messages: WebSocketMessage[];
  connect: () => void;
  disconnect: () => void;
  authenticate: (userData: { user_id: string; username: string; role: any }) => void;
  subscribeToAsset: (assetId: string) => void;
  unsubscribeFromAsset: (assetId: string) => void;
  subscribeToWorkOrder: (workOrderId: string) => void;
  unsubscribeFromWorkOrder: (workOrderId: string) => void;
}

// Create the context
const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Provider component
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  useEffect(() => {
    // Connect to WebSocket on mount
    wsService.connect();
    setIsConnected(wsService.getConnectionStatus().connected);

    // Set up message listener
    const unsubscribe = wsService.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      setIsConnected(wsService.getConnectionStatus().connected);
    }, 3000);

    // Cleanup on unmount
    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, []);

  // Set up auto-authentication if user data exists in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          if (userData && userData.user_id) {
            wsService.authenticate(userData);
          }
        } catch (error) {
          console.error('Failed to parse user data from localStorage:', error);
        }
      }
    }
  }, []);

  // Define the context value
  const value: WebSocketContextType = {
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

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook for using the WebSocket context
export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}
