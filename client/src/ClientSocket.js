let socket = null;
let messageCallbacks = [];

export const initializeSocket = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket;
  }

  // Use ws:// for HTTP and continue using it (server doesn't have SSL)
  const wsUrl = `ws://${window.location.hostname}:8000/ws`;
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket connection established");
  };

  socket.onmessage = (event) => {
    console.log("Received message:", event.data);
    const message = JSON.parse(event.data);
    
    // Notify all registered callbacks
    messageCallbacks.forEach(callback => callback(message));
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    socket = null;
    messageCallbacks = [];
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return socket;
};

export const onMessage = (callback) => {
  messageCallbacks.push(callback);
  
  // Return unsubscribe function
  return () => {
    messageCallbacks = messageCallbacks.filter(cb => cb !== callback);
  };
};

export const SocketSend = (data) => {
  const ws = initializeSocket();

  if (ws.readyState === WebSocket.OPEN) {
    console.log("Sending data:", data);
    ws.send(JSON.stringify(data));
  } else {
    ws.addEventListener('open', () => {
      console.log("Sending data:", data);
      ws.send(JSON.stringify(data));
    }, { once: true });
  }
};

export const closeSocket = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
};