let websocket: WebSocket | null = null;

export function connectWebSocket(): WebSocket {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    return websocket;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  websocket = new WebSocket(wsUrl);

  websocket.onopen = () => {
    console.log('WebSocket connected');
  };

  websocket.onclose = (event) => {
    console.log('WebSocket disconnected:', event.code, event.reason);
    websocket = null;
    
    // Attempt to reconnect after 3 seconds
    setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      connectWebSocket();
    }, 3000);
  };

  websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return websocket;
}

export function sendWebSocketMessage(message: any) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(message));
  } else {
    console.warn('WebSocket is not connected, cannot send message:', message);
  }
}

export function closeWebSocket() {
  if (websocket) {
    websocket.close();
    websocket = null;
  }
}
