// =============================================================================
// SentinelOps - Backend Server Entry Point
// =============================================================================

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import alertsRoutes from './routes/alerts';
import vulnerabilitiesRoutes from './routes/vulnerabilities';
import pipelineRoutes from './routes/pipeline';
import threatsRoutes from './routes/threats';
import metricsRoutes from './routes/metrics';
import agentsRoutes from './routes/agents';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';

// Import database connection
import { connectDatabase } from './database/connection';

// Import WebSocket handlers
import { setupWebSocket } from './websocket/handler';

// Initialize Express app
const app: Application = express();
const httpServer = createServer(app);

// Initialize Socket.IO for real-time updates
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', authMiddleware, alertsRoutes);
app.use('/api/vulnerabilities', authMiddleware, vulnerabilitiesRoutes);
app.use('/api/pipeline', authMiddleware, pipelineRoutes);
app.use('/api/threats', authMiddleware, threatsRoutes);
app.use('/api/metrics', authMiddleware, metricsRoutes);
app.use('/api/agents', authMiddleware, agentsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.path,
  });
});

// Error handler
app.use(errorHandler);

// =============================================================================
// WEBSOCKET SETUP
// =============================================================================

setupWebSocket(io);

// Make io accessible in routes
app.set('io', io);

// =============================================================================
// SERVER STARTUP
// =============================================================================

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🛡️  SentinelOps Backend Server                              ║
║                                                               ║
║   Status:  RUNNING                                            ║
║   Port:    ${PORT}                                               ║
║   Mode:    ${process.env.NODE_ENV || 'development'}                                     ║
║                                                               ║
║   API:     http://${HOST}:${PORT}/api                              ║
║   Health:  http://${HOST}:${PORT}/health                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();

export { app, io };
