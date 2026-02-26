// =============================================================================
// SentinelOps - WebSocket Handler
// =============================================================================

import { Server as SocketServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export const setupWebSocket = (io: SocketServer): void => {
  io.on('connection', (socket: Socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    // Join rooms based on user role/preferences
    socket.on('join-room', (room: string) => {
      socket.join(room);
      logger.info(`Client ${socket.id} joined room: ${room}`);
    });

    // Leave room
    socket.on('leave-room', (room: string) => {
      socket.leave(room);
      logger.info(`Client ${socket.id} left room: ${room}`);
    });

    // Subscribe to alert severity levels
    socket.on('subscribe-alerts', (severities: string[]) => {
      severities.forEach(severity => {
        socket.join(`alerts-${severity}`);
      });
      logger.info(`Client ${socket.id} subscribed to alert severities: ${severities.join(', ')}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason: string) => {
      logger.info(`WebSocket client disconnected: ${socket.id} - ${reason}`);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      logger.error(`WebSocket error for client ${socket.id}:`, error);
    });
  });

  // Middleware for authentication (optional)
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    // Validate token if needed
    // For now, allow all connections
    next();
  });

  logger.info('WebSocket server initialized');
};

// Helper functions to emit events
export const emitAlert = (io: SocketServer, alert: any): void => {
  io.emit('new-alert', alert);
  io.to(`alerts-${alert.severity}`).emit('alert-severity', alert);
};

export const emitThreat = (io: SocketServer, threat: any): void => {
  io.emit('new-threat', threat);
  if (threat.classification === 'attack' || threat.classification === 'high_risk') {
    io.emit('high-threat', threat);
  }
};

export const emitPipelineUpdate = (io: SocketServer, result: any): void => {
  io.emit('pipeline-result', result);
};

export const emitMetricsUpdate = (io: SocketServer, metrics: any): void => {
  io.emit('metrics-update', metrics);
};
