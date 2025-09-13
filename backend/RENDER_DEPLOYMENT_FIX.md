# 🚀 Render Deployment Configuration Guide

## Issue Resolution: ECONNRESET and "Related record not found" Errors

### Problem Analysis
1. **ECONNRESET errors**: Database connection issues in production environment
2. **"Related record not found"**: Missing event6 reference in seed file

### Solutions Implemented

#### 1. Fixed Seed File
- **Issue**: Seed file referenced `event6` but only created 5 events
- **Fix**: Added the missing 6th event (PDEU Sports Championship)
- **Location**: `backend/prisma/seed.ts`

#### 2. Improved Database Connection Handling
- **Added connection pooling parameters for production**
- **Implemented retry logic for database operations**
- **Enhanced error handling for connection issues**

### Environment Configuration for Render

#### Backend Environment Variables (Render)
```env
NODE_ENV=production
PORT=4000

# Database (Use your Render PostgreSQL URL)
DATABASE_URL=postgresql://username:password@hostname:port/database?sslmode=require&connection_limit=10&pool_timeout=20&connect_timeout=60&socket_timeout=60

# Redis (Use your Upstash Redis URL)  
REDIS_URL=redis://username:password@hostname:port

# Security
JWT_SECRET=your-64-character-super-secure-jwt-secret-for-production
JWT_EXPIRES_IN=7d

# Email Service (Production)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM_NAME=Evently
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=your-support-email@yourdomain.com

# CORS & URLs
FRONTEND_URL=https://your-frontend-domain.netlify.app
API_URL=https://your-backend.onrender.com

# Workers
ENABLE_WORKERS=true
```

#### Important Notes for Production DATABASE_URL

The DATABASE_URL should include these parameters to prevent ECONNRESET:
- `sslmode=require` - For secure connections
- `connection_limit=10` - Limit concurrent connections
- `pool_timeout=20` - Connection pool timeout
- `connect_timeout=60` - Connection timeout
- `socket_timeout=60` - Socket timeout

Example:
```
postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=10&pool_timeout=20&connect_timeout=60&socket_timeout=60&pgbouncer=true
```

### Database Migration Commands for Render

1. **Initial Setup**:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Seed Database** (Run once):
   ```bash
   npm run db:seed
   ```

3. **Reset Database** (If needed):
   ```bash
   npx prisma migrate reset --force
   npm run db:seed
   ```

### Build Commands for Render

**Build Command**:
```bash
npm install && npx prisma generate && npm run build
```

**Start Command**:
```bash
npm start
```

### Health Check Endpoint

The application includes a health check at:
- `GET /health` - Basic health check
- `GET /api/health` - API health check with database status

### Monitoring & Debugging

1. **Check logs** in Render dashboard for connection errors
2. **Monitor database connections** in your PostgreSQL dashboard
3. **Use the test script**: `npm run test:db` to verify connections
4. **Check Redis connection** with Upstash dashboard

### Quick Fix Commands

If you encounter issues after deployment:

1. **Clear database and reseed**:
   ```bash
   # In Render shell
   npx prisma migrate reset --force
   npm run db:seed
   ```

2. **Test database connection**:
   ```bash
   npm run test:connection
   ```

3. **Check application health**:
   ```bash
   curl https://your-app.onrender.com/health
   ```

### Troubleshooting Common Issues

#### "Related record not found" Error
- **Cause**: Database not properly seeded
- **Fix**: Run `npm run db:seed` in Render shell

#### ECONNRESET Errors
- **Cause**: Database connection timeout/pool issues  
- **Fix**: Ensure DATABASE_URL has proper connection parameters
- **Verify**: Redis URL is correct for Upstash

#### Slow Response Times
- **Cause**: Cold starts on Render free tier
- **Fix**: Upgrade to paid plan for better performance
- **Optimize**: Database queries and connection pooling

### Testing the Fix

1. **Test booking endpoint**:
   ```bash
   curl -X POST https://your-app.onrender.com/api/bookings \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-jwt-token" \
     -d '{"eventId":"event-id","quantity":1}'
   ```

2. **Check database health**:
   ```bash
   curl https://your-app.onrender.com/api/health
   ```

### Performance Optimizations

1. **Connection Pooling**: Implemented in database config
2. **Retry Logic**: Added for failed operations  
3. **Error Handling**: Enhanced for production deployment
4. **Caching**: Redis-based caching for frequently accessed data

### Final Checklist

- [ ] DATABASE_URL includes connection parameters
- [ ] REDIS_URL is correctly configured for Upstash
- [ ] All environment variables are set in Render
- [ ] Database is migrated and seeded
- [ ] Health check endpoints return 200
- [ ] Booking API works without ECONNRESET errors
- [ ] Frontend can connect to backend API

After implementing these changes, your booking system should work reliably on Render with Upstash Redis.
