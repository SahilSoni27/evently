"use strict";
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
// Load environment variables
dotenv.config();
// Import routes
const authRoutes = require('./routes/auth');
// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput, validateRequestSize } = require('./middleware/validation');
const app = express();
const PORT = process.env.PORT || 4000;
// Trust proxy for rate limiting (if behind reverse proxy)
app.set('trust proxy', 1);
// Security and rate limiting middleware
app.use(generalLimiter);
app.use(sanitizeInput);
app.use(validateRequestSize);
// Basic middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
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
// API Routes
app.use('/api/auth', authRoutes.default || authRoutes);
// Placeholder endpoints for other routes
app.get('/api/events', (req, res) => {
    res.json({ message: 'Events endpoints not implemented yet' });
});
app.get('/api/bookings', (req, res) => {
    res.json({ message: 'Bookings endpoints not implemented yet' });
});
app.get('/api/admin', (req, res) => {
    res.json({ message: 'Admin endpoints not implemented yet' });
});
// 404 handler for undefined routes
app.use(notFoundHandler);
// Global error handler (must be last)
app.use(errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
module.exports = app;
