"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const events_1 = __importDefault(require("./routes/events"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const adminAnalytics_1 = __importDefault(require("./routes/adminAnalytics"));
const adminDashboard_1 = __importDefault(require("./routes/adminDashboard"));
const payments_1 = __importDefault(require("./routes/payments"));
const queueManagement_1 = __importDefault(require("./routes/queueManagement"));
const waitlist_1 = __importDefault(require("./routes/waitlist"));
const tickets_1 = __importDefault(require("./routes/tickets"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const search_1 = __importDefault(require("./routes/search"));
const docs_1 = __importDefault(require("./routes/docs"));
const seats_1 = __importDefault(require("./routes/seats"));
// Load environment variables
dotenv_1.default.config();
// Initialize workers in production
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_WORKERS === 'true') {
    Promise.resolve().then(() => __importStar(require('./workers'))).then(() => {
        console.log('🔄 Background workers initialized');
    }).catch(err => {
        console.error('❌ Failed to initialize workers:', err);
    });
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3000',
            'https://eventlyatlan.netlify.app'
        ];
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin)
            return callback(null, true);
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
const limiter = (0, express_rate_limit_1.default)({
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
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
app.use('/api/auth', auth_1.default);
app.use('/api/events', events_1.default);
app.use('/api/bookings', bookings_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/seats', seats_1.default);
app.use('/api/admin/analytics', adminAnalytics_1.default);
app.use('/api/admin', adminDashboard_1.default);
app.use('/api/admin/queues', queueManagement_1.default);
app.use('/api/waitlist', waitlist_1.default);
app.use('/api/tickets', tickets_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/search', search_1.default);
// API Documentation
app.use('/api-docs', docs_1.default);
// Test routes removed for now - will test via existing endpoints
// Placeholder endpoints for routes we haven't implemented yet
app.get('/api/admin', (req, res) => {
    res.status(501).json({
        status: 'error',
        message: 'Admin endpoints not implemented yet'
    });
});
// 404 handler (must be before error handler)
app.use(errorHandler_1.notFound);
// Global error handler (must be last)
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`� Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`� Analytics: http://localhost:${PORT}/api/admin/analytics/overview`);
});
module.exports = app;
