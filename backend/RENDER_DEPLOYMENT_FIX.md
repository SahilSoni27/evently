# 🚀 Render Deployment Configuration Guide

## Issue Resolution: ECONNRESET and "Related record not found" Errors

### 🚨 URGENT: ECONNRESET Fix for Live Deployment

**If you're seeing multiple ECONNRESET errors on your live Render deployment:**

1. **Go to Render Dashboard → Your Service → Environment**
2. **Check your REDIS_URL format** - it MUST be exactly:
   ```
   redis://default:your-password@your-endpoint.upstash.io:port
   ```
3. **Verify in Upstash Console** that your Redis instance is active
4. **Redeploy** your service after fixing the REDIS_URL
5. **Test immediately**: `curl https://your-app.onrender.com/api/health`

### Problem Analysis

1. **ECONNRESET errors**: Primarily Redis connection issues with Upstash
2. **"Related record not found"**: Missing event6 reference in seed file
3. **Transaction timeouts**: Database operations taking too long

### Solutions Implemented

#### 1. Fixed Redis Connection Issues (Primary ECONNRESET Fix)

- **Issue**: Upstash Redis connection timeouts and ECONNRESET errors
- **Fix**: Enhanced Redis configuration with proper timeouts and error handling
- **Location**: `backend/src/lib/redis.ts`
- **Key changes**:
  - Increased connection timeouts for Upstash (30s)
  - Added proper error handling for ECONNRESET
  - Disabled auto-pipelining for better stability
  - Environment-specific configuration

#### 2. Fixed Transaction Timeouts

- **Issue**: Database transactions timing out after 5 seconds
- **Fix**: Increased transaction timeout to 15 seconds
- **Location**: `backend/src/controllers/bookingController.ts`
- **Impact**: Prevents booking failures due to slow operations

#### 3. Fixed Seed File

- **Issue**: Seed file referenced `event6` but only created 5 events
- **Fix**: Added the missing 6th event (PDEU Sports Championship)
- **Location**: `backend/prisma/seed.ts`

#### 4. Improved Database Connection Handling

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

#### Critical: Upstash Redis Configuration

The ECONNRESET errors you're seeing are likely from Redis connection issues. Ensure your Upstash Redis URL is correctly formatted:

**Correct Upstash Redis URL format:**

```
redis://default:password@region-endpoint.upstash.io:port
```

**Key settings for Upstash Redis:**

- Use the **Redis 6.0** compatible endpoint
- Enable **TLS** if using rediss:// protocol
- Set proper connection timeouts (30 seconds)
- Disable auto-pipelining for better stability

**Example Upstash URLs:**

```bash
# Without TLS (recommended for initial testing)
REDIS_URL=redis://default:your-password@us1-leading-mollusk-12345.upstash.io:12345

# With TLS (for production)
REDIS_URL=rediss://default:your-password@us1-leading-mollusk-12345.upstash.io:12346
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

1. **Test Redis connection first**:

   ```bash
   # In Render shell
   npm run test:redis
   ```

2. **Check detailed health status**:

   ```bash
   curl https://your-app.onrender.com/api/health
   ```

3. **Clear database and reseed**:

   ```bash
   # In Render shell
   npx prisma migrate reset --force
   npm run db:seed
   ```

4. **Test database connection**:

   ```bash
   npm run test:db
   ```

5. **Basic health check**:
   ```bash
   curl https://your-app.onrender.com/health
   ```

### Emergency Redis Fix for ECONNRESET

If you're getting continuous ECONNRESET errors:

1. **Log into Upstash Console**:

   - Go to https://console.upstash.com/
   - Check if your Redis instance is active
   - Note the connection details

2. **Get the correct Redis URL**:

   ```bash
   # Format should be exactly:
   redis://default:PASSWORD@ENDPOINT.upstash.io:PORT
   ```

3. **Update Render Environment Variable**:

   - Go to your Render service dashboard
   - Find REDIS_URL in Environment Variables
   - Update with the exact URL from Upstash
   - Redeploy the service

4. **Test immediately after deployment**:

   ```bash
   curl https://your-app.onrender.com/api/health
   ```

   Look for `"redis": {"status": "healthy"}` in the response.

### Troubleshooting Common Issues

#### "Related record not found" Error

- **Cause**: Database not properly seeded
- **Fix**: Run `npm run db:seed` in Render shell

#### ECONNRESET Errors (Most Common Issue)

**Symptoms**: Multiple `Error: read ECONNRESET` messages in Render logs

**Primary Cause**: Upstash Redis connection issues

**Step-by-step Fix:**

1. **Verify Upstash Redis URL Format**:

   ```bash
   # Check your Render environment variables
   # Correct format: redis://default:password@endpoint:port
   ```

2. **Test Redis Connection**:

   ```bash
   # In Render shell, run:
   npm run test:redis
   ```

3. **Update Redis Configuration**:

   - Ensure you're using the correct Upstash endpoint
   - Try switching between TLS and non-TLS endpoints
   - Check if your Upstash instance is active

4. **Common Upstash Redis Issues**:

   - **Wrong URL format**: Must include `default` as username
   - **Expired instance**: Check Upstash dashboard for instance status
   - **Connection limits**: Upstash free tier has connection limits
   - **Region mismatch**: Use same region as your Render deployment

5. **Immediate Fix**:

   ```bash
   # In Render dashboard, update REDIS_URL to:
   redis://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:PORT

   # Then redeploy the service
   ```

#### Database Connection Issues

- **Cause**: Database connection timeout/pool issues
- **Fix**: Ensure DATABASE_URL has proper connection parameters

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
