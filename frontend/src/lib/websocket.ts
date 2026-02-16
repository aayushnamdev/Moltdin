import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export interface WebSocketEventHandlers {
  onNotification?: (notification: any) => void;
  onMessage?: (message: any) => void;
  onActivityUpdate?: (activity: any) => void;
  onAgentActive?: (data: { agentId: string; isActive: boolean }) => void;
  onAgentInactive?: (data: { agentId: string; isActive: boolean }) => void;
  onTyping?: (data: { agentId: string; isTyping: boolean }) => void;
  onMessageRead?: (data: { messageId: string; readBy: string }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Initialize WebSocket connection
 */
export function initializeWebSocket(token: string, handlers: WebSocketEventHandlers = {}) {
  if (socket?.connected) {
    console.log('🔌 WebSocket already connected');
    return socket;
  }

  const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  console.log('🔌 Connecting to WebSocket server:', serverUrl);

  socket = io(serverUrl, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('✅ WebSocket connected:', socket?.id);
    handlers.onConnect?.();
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket disconnected:', reason);
    handlers.onDisconnect?.();
  });

  socket.on('connect_error', (error) => {
    console.error('❌ WebSocket connection error:', error);
    handlers.onError?.(error);
  });

  // Real-time event handlers
  socket.on('notification:new', (notification) => {
    console.log('📬 New notification received:', notification);
    handlers.onNotification?.(notification);
  });

  socket.on('message:new', (message) => {
    console.log('💬 New message received:', message);
    handlers.onMessage?.(message);
  });

  socket.on('message:typing', (data) => {
    console.log('⌨️ Typing indicator:', data);
    handlers.onTyping?.(data);
  });

  socket.on('message:read', (data) => {
    console.log('✓ Message read:', data);
    handlers.onMessageRead?.(data);
  });

  socket.on('activity:update', (activity) => {
    console.log('📊 Activity update:', activity);
    handlers.onActivityUpdate?.(activity);
  });

  socket.on('agent:active', (data) => {
    console.log('🟢 Agent active:', data);
    handlers.onAgentActive?.(data);
  });

  socket.on('agent:inactive', (data) => {
    console.log('🔴 Agent inactive:', data);
    handlers.onAgentInactive?.(data);
  });

  // Pong handler for heartbeat
  socket.on('pong', () => {
    // console.log('🏓 Pong received');
  });

  return socket;
}

/**
 * Get the current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect WebSocket
 */
export function disconnectWebSocket() {
  if (socket) {
    console.log('🔌 Disconnecting WebSocket');
    socket.disconnect();
    socket = null;
  }
}

/**
 * Send typing indicator
 */
export function sendTypingIndicator(recipientId: string, isTyping: boolean) {
  if (!socket?.connected) {
    console.warn('⚠️ Cannot send typing indicator: Socket not connected');
    return;
  }

  socket.emit('message:typing', { recipientId, isTyping });
}

/**
 * Send message read receipt
 */
export function sendMessageRead(messageId: string, senderId: string) {
  if (!socket?.connected) {
    console.warn('⚠️ Cannot send read receipt: Socket not connected');
    return;
  }

  socket.emit('message:read', { messageId, senderId });
}

/**
 * Send notification read acknowledgment
 */
export function sendNotificationRead(notificationId: string) {
  if (!socket?.connected) {
    console.warn('⚠️ Cannot send notification read: Socket not connected');
    return;
  }

  socket.emit('notification:read', { notificationId });
}

/**
 * Subscribe to a room (e.g., channel, conversation)
 */
export function subscribeToRoom(room: string) {
  if (!socket?.connected) {
    console.warn('⚠️ Cannot subscribe: Socket not connected');
    return;
  }

  socket.emit('subscribe', room);
  console.log('📢 Subscribed to room:', room);
}

/**
 * Unsubscribe from a room
 */
export function unsubscribeFromRoom(room: string) {
  if (!socket?.connected) {
    console.warn('⚠️ Cannot unsubscribe: Socket not connected');
    return;
  }

  socket.emit('unsubscribe', room);
  console.log('🔇 Unsubscribed from room:', room);
}

/**
 * Send ping to keep connection alive
 */
export function sendPing() {
  if (!socket?.connected) {
    return;
  }

  socket.emit('ping');
}

// Heartbeat interval (every 30 seconds)
let heartbeatInterval: NodeJS.Timeout | null = null;

export function startHeartbeat() {
  if (heartbeatInterval) {
    return;
  }

  heartbeatInterval = setInterval(() => {
    sendPing();
  }, 30000);

  console.log('💓 Heartbeat started');
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('💓 Heartbeat stopped');
  }
}

export default {
  initializeWebSocket,
  getSocket,
  disconnectWebSocket,
  sendTypingIndicator,
  sendMessageRead,
  sendNotificationRead,
  subscribeToRoom,
  unsubscribeFromRoom,
  sendPing,
  startHeartbeat,
  stopHeartbeat,
};
