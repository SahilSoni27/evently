import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import prisma from './lib/prisma';

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import bookingRoutes from './routes/bookings';
import adminAnalyticsRoutes from './routes/adminAnalytics';
import adminDashboardRoutes from './routes/adminDashboard';
import paymentRoutes from './routes/payments';
import queueManagementRoutes from './routes/queueManagement';
import waitlistRoutes from './routes/waitlist';
import ticketRoutes from './routes/tickets';
import notificationRoutes from './routes/notifications';
import searchRoutes from './routes/search';
import docsRoutes from './routes/docs';
import seatRoutes from './routes/seats';

// Load environment variables
dotenv.config();

// Initialize workers in production
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_WORKERS === 'true') {
  import('./workers').then(() => {
    console.log('🔄 Background workers initialized');
  }).catch(err => {
    console.error('❌ Failed to initialize workers:', err);
  });
}

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3000',
      'https://eventlyatlan.netlify.app'
    ];
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Allow Netlify domains
    if (origin.endsWith('.netlify.app')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit for development
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Evently API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Detailed health check with database connectivity
app.get('/api/health', async (req, res) => {
  const healthCheck: any = {
    status: 'success',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: { status: 'unknown', responseTime: 0 },
      redis: { status: 'unknown', responseTime: 0 }
    }
  };

  // Test database connection
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.services.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    healthCheck.services.database = {
      status: 'unhealthy',
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
    healthCheck.status = 'degraded';
  }

  // Test Redis connection
  try {
    const { default: redisCache } = await import('./lib/redis');
    const redisStart = Date.now();
    await redisCache.set('health-check', 'ok', 5);
    await redisCache.get('health-check');
    healthCheck.services.redis = {
      status: 'healthy',
      responseTime: Date.now() - redisStart
    };
  } catch (error) {
    healthCheck.services.redis = {
      status: 'unhealthy',
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Redis connection failed'
    };
    if (healthCheck.status === 'success') {
      healthCheck.status = 'degraded';
    }
  }

  const statusCode = healthCheck.status === 'success' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// Test endpoint for frontend connectivity
app.get('/api/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Frontend can reach backend!',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/admin/data', adminAnalyticsRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin/queues', queueManagementRoutes);
app.use('/api', waitlistRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);

// API Documentation
app.use('/api-docs', docsRoutes);

// Test routes removed for now - will test via existing endpoints

// Placeholder endpoints for routes we haven't implemented yet
app.get('/api/admin', (req, res) => {
  res.status(501).json({ 
    status: 'error',
    message: 'Admin endpoints not implemented yet' 
  });
});

// 404 handler (must be before error handler)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`� Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Admin Data: http://localhost:${PORT}/api/admin/data/overview`);
});

// Configure server timeouts to prevent ECONNRESET errors
server.timeout = 60000; // 60 seconds
server.keepAliveTimeout = 65000; // 65 seconds (should be greater than timeout)
server.headersTimeout = 66000; // 66 seconds (should be greater than keepAliveTimeout)

module.exports = app;
