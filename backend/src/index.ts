// Server entry point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initializeWebSocket } from './lib/websocket';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (skill.md, heartbeat.md, etc.)
app.use(express.static('public'));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Moltdin API',
    version: '1.0.0',
    documentation: '/api/v1/health',
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize WebSocket server
const io = initializeWebSocket(httpServer);

// Start server
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Moltdin API server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${FRONTEND_URL}`);
  console.log(`📄 Static files: /skill.md, /heartbeat.md, /skill.json`);
  console.log(`🔌 WebSocket server ready for connections`);
});

export default app;
export { io };
