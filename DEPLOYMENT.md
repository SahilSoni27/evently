# 🚀 Evently Production Deployment Guide

This guide covers deploying Evently to production environments with high availability and security.

## 🏗️ Architecture Overview

```
Internet
    ↓
Load Balancer (Cloudflare/AWS ALB)
    ↓
Frontend (Vercel/Netlify)
    ↓
Backend API (Railway/Render)
    ↓
┌─────────────────┬─────────────────┐
│   PostgreSQL    │      Redis      │
│   (Managed)     │   (Managed)     │
└─────────────────┴─────────────────┘
```

## 🌐 Deployment Options

### 🎯 Recommended Stack (Easiest)
- **Frontend:** Vercel
- **Backend:** Railway
- **Database:** Railway PostgreSQL
- **Redis:** Railway Redis
- **Email:** SendGrid
- **Monitoring:** Railway built-in

### 🏢 Enterprise Stack
- **Frontend:** AWS CloudFront + S3
- **Backend:** AWS ECS/EKS
- **Database:** AWS RDS PostgreSQL
- **Redis:** AWS ElastiCache
- **Email:** AWS SES
- **Monitoring:** AWS CloudWatch

## 🚀 Quick Deploy (Railway - Recommended)

### 1. Deploy Backend to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway new

# Deploy backend
cd backend
railway up
```

**Set Environment Variables in Railway:**
```env
NODE_ENV=production
DATABASE_URL=<railway-will-provide>
REDIS_URL=<railway-will-provide>
JWT_SECRET=<generate-strong-secret>
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=<your-sendgrid-key>
VAPID_PUBLIC_KEY=<your-vapid-public>
VAPID_PRIVATE_KEY=<your-vapid-private>
VAPID_EMAIL=<your-email>
PORT=4000
```

### 2. Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
cd frontend
vercel

# Set environment variables in Vercel dashboard:
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_VAPID_KEY=<your-vapid-public>
```

### 3. Set up Database
```bash
# Connect to Railway project
railway shell

# Run migrations
npx prisma migrate deploy
npx prisma generate
npm run db:seed
```

## 📧 Email Service Setup

### SendGrid (Recommended)
1. Sign up at https://sendgrid.com/
2. Get API key from Settings > API Keys
3. Verify sender identity
4. Set environment variables:
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Evently
```

### AWS SES (Enterprise)
```env
EMAIL_SERVICE=ses
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
```

### Mailgun (Alternative)
```env
EMAIL_SERVICE=mailgun
MAILGUN_API_KEY=xxx
MAILGUN_DOMAIN=yourdomain.com
```

## 🔧 Environment Configuration

### Backend Production Environment
```env
# Server
NODE_ENV=production
PORT=4000

# Database (Railway/AWS RDS)
DATABASE_URL=postgresql://user:pass@host:port/db

# Redis (Railway/AWS ElastiCache)
REDIS_URL=redis://host:port

# Security
JWT_SECRET=<64-character-random-string>
JWT_EXPIRES_IN=7d

# Email
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM_NAME=Evently
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Push Notifications
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_EMAIL=support@yourdomain.com

# CORS
FRONTEND_URL=https://yourdomain.com

# Workers
ENABLE_WORKERS=true
```

### Frontend Production Environment
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_VAPID_KEY=xxx
NEXT_PUBLIC_APP_NAME=Evently
```

## 🛡️ Security Checklist

### Backend Security
- [ ] JWT_SECRET is strong (64+ characters)
- [ ] CORS is configured for your domain only
- [ ] Rate limiting is enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (Prisma ORM)
- [ ] XSS protection headers
- [ ] HTTPS only in production
- [ ] Environment variables are secure

### Database Security
- [ ] Database is not publicly accessible
- [ ] Strong database passwords
- [ ] Connection pooling configured
- [ ] Regular backups enabled
- [ ] SSL/TLS connections only

### Infrastructure Security
- [ ] Firewall rules configured
- [ ] VPC/Private networks
- [ ] DDoS protection enabled
- [ ] Regular security updates
- [ ] Monitoring and alerting

## 📊 Performance Optimization

### Backend Optimizations
```typescript
// Production optimizations in package.json
{
  "scripts": {
    "build": "tsc && npm run optimize",
    "optimize": "npm prune --production",
    "start": "node dist/index.js"
  }
}
```

### Database Optimizations
```sql
-- Add indexes for better performance
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_waitlist_event_id ON waitlists(event_id);
```

### Redis Configuration
```env
# Redis performance settings
REDIS_MAX_MEMORY=256mb
REDIS_MAX_MEMORY_POLICY=allkeys-lru
REDIS_TIMEOUT=5000
```

### Frontend Optimizations
```typescript
// next.config.js optimizations
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizeImages: true,
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  httpAgentOptions: {
    keepAlive: true,
  }
}
```

## 📈 Monitoring & Logging

### Application Monitoring
```typescript
// Add to backend/src/index.ts
import { createPrometheusMetrics } from './monitoring/prometheus';
import { createHealthCheck } from './monitoring/health';

// Metrics endpoint
app.get('/metrics', createPrometheusMetrics());

// Detailed health check
app.get('/health/detailed', createHealthCheck());
```

### Error Tracking
```bash
# Add Sentry for error tracking
npm install @sentry/node @sentry/tracing
```

```typescript
// Add to backend/src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Log Management
```typescript
// Structured logging with Winston
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd backend && npm ci
      
      - name: Run tests
        run: cd backend && npm test
      
      - name: Deploy to Railway
        run: railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
  
  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd frontend && npm ci
      
      - name: Build
        run: cd frontend && npm run build
      
      - name: Deploy to Vercel
        run: vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 🌍 Custom Domain Setup

### Backend Domain (api.yourdomain.com)
1. **Railway:**
   - Go to your project settings
   - Add custom domain: `api.yourdomain.com`
   - Update DNS CNAME record

2. **AWS/DigitalOcean:**
   - Set up load balancer
   - Configure SSL certificate
   - Update DNS A record

### Frontend Domain (yourdomain.com)
1. **Vercel:**
   - Go to project settings
   - Add domain: `yourdomain.com`
   - Update DNS records as instructed

2. **Cloudflare (recommended):**
   - Add your domain to Cloudflare
   - Enable proxy and SSL
   - Set up page rules for caching

## 📱 Mobile App Considerations

### PWA Setup
```typescript
// Add to frontend/next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // your existing config
});
```

### Push Notifications
- VAPID keys work for web push
- For native mobile apps, integrate Firebase FCM
- Use same backend notification system

## 🔧 Scaling Considerations

### Horizontal Scaling
```yaml
# docker-compose.production.yml
version: '3.8'
services:
  backend:
    image: your-backend-image
    replicas: 3
    environment:
      - NODE_ENV=production
    
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Database Scaling
- Read replicas for heavy read workloads
- Connection pooling (PgBouncer)
- Partitioning for large tables
- Redis cluster for high availability

### CDN Setup
```typescript
// Static assets via CDN
const CDN_URL = process.env.CDN_URL || '';

export const getAssetUrl = (path: string) => {
  return `${CDN_URL}${path}`;
};
```

## 🚨 Disaster Recovery

### Backup Strategy
```bash
# Database backups
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql s3://your-backup-bucket/
```

### Recovery Plan
1. **Database Recovery:**
   - Restore from latest backup
   - Apply any missing migrations
   - Verify data integrity

2. **Application Recovery:**
   - Deploy from last known good commit
   - Verify all services are running
   - Run health checks

3. **Rollback Strategy:**
   - Keep previous 3 deployment versions
   - Use feature flags for gradual rollouts
   - Database migration rollback scripts

## 📋 Production Checklist

### Pre-Launch
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] SSL certificates configured
- [ ] Custom domains configured
- [ ] Email service tested
- [ ] Push notifications tested
- [ ] Rate limiting configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Load testing completed

### Post-Launch
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all integrations
- [ ] Monitor resource usage
- [ ] Set up alerts
- [ ] Document any issues
- [ ] Plan scaling strategy

## 🔗 Useful Production URLs

Once deployed, you'll have:
- **Frontend:** https://yourdomain.com
- **API:** https://api.yourdomain.com
- **Docs:** https://api.yourdomain.com/api-docs
- **Health:** https://api.yourdomain.com/health
- **Metrics:** https://api.yourdomain.com/metrics

---

**Ready for production?** Follow this guide step by step and your Evently platform will be running smoothly at scale! 🚀
