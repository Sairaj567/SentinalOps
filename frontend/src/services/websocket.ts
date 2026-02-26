// =============================================================================
// SentinelOps - WebSocket Service
// =============================================================================

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:4000';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    const token = useAuthStore.getState().token;
    
    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket error:', error);
    });

    // Alert events
    this.socket.on('alert:new', (data) => {
      this.emit('alert:new', data);
    });

    this.socket.on('alert:updated', (data) => {
      this.emit('alert:updated', data);
    });

    // Threat events
    this.socket.on('threat:detected', (data) => {
      this.emit('threat:detected', data);
    });

    // Pipeline events
    this.socket.on('pipeline:completed', (data) => {
      this.emit('pipeline:completed', data);
    });

    // Agent events
    this.socket.on('agent:status', (data) => {
      this.emit('agent:status', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  send(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }
}

export const wsService = new WebSocketService();
