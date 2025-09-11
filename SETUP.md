# 🚀 Evently Setup Guide

This guide will help you set up the complete Evently system from scratch.

## 📋 Prerequisites

Before starting, ensure you have:
- **Node.js 18+** (Download from https://nodejs.org/)
- **npm or pnpm** (comes with Node.js)
- **PostgreSQL 15+** (Download from https://postgresql.org/)
- **Redis 7+** (Download from https://redis.io/)
- **Git** (Download from https://git-scm.com/)

## 🛠️ Quick Setup (Recommended)

### 1. Clone the Repository
```bash
git clone https://github.com/SahilSoni27/evently.git
cd evently
```

### 2. Database Setup (Docker - Easiest)
```bash
# Start PostgreSQL and Redis using Docker
cd infra
docker-compose up -d

# Wait a few seconds for services to start
```

**Alternative: Manual Database Setup**
If you prefer to install manually:
- Install PostgreSQL and create a database named `evently_db`
- Install Redis and start the service
- Update the DATABASE_URL in your .env file accordingly

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# IMPORTANT: Edit .env file now (see Environment Configuration section below)

# Run database migrations
npx prisma migrate dev
npx prisma generate

# Seed database with sample data
npm run db:seed

# Start backend server
npm run dev
```

### 4. Frontend Setup
```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# IMPORTANT: Edit .env.local file (see Environment Configuration section below)

# Start frontend server
npm run dev
```

### 5. Verify Installation
- Backend API: http://localhost:4000/health
- Frontend UI: http://localhost:3001
- API Documentation: http://localhost:4000/api-docs

## ⚙️ Environment Configuration

### 🔧 Backend Environment (.env)

**REQUIRED MANUAL UPDATES:**

#### 1. JWT Secret (CRITICAL for security)
```env
JWT_SECRET="your-super-secret-jwt-key-change-in-production-make-it-very-strong"
```
**How to generate:** Use a password generator to create a 64+ character random string.

#### 2. Email Configuration (Choose ONE option)

**Option A: Gmail (Recommended for development)**
```env
EMAIL_SERVICE="gmail"
EMAIL_USER="your-email@gmail.com"
EMAIL_APP_PASSWORD="your-gmail-app-password"
```

**How to get Gmail App Password:**
1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Go to "App passwords"
4. Generate password for "Mail"
5. Use the generated password (not your regular password)

**Option B: Ethereal (Testing only - creates fake emails)**
```env
EMAIL_SERVICE="ethereal"
```
No additional configuration needed. Check https://ethereal.email/ for sent emails.

#### 3. Push Notifications (VAPID Keys)
```env
VAPID_PUBLIC_KEY="your-vapid-public-key-here"
VAPID_PRIVATE_KEY="your-vapid-private-key-here"
VAPID_EMAIL="your-email@example.com"
```

**How to generate VAPID keys:**
```bash
cd backend
npx web-push generate-vapid-keys
```
Copy the output to your .env file.

### 🔧 Frontend Environment (.env.local)

**REQUIRED MANUAL UPDATES:**

#### 1. API URL (should match backend port)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

#### 2. VAPID Public Key (copy from backend .env)
```env
NEXT_PUBLIC_VAPID_KEY=your-vapid-public-key-here
```
Use the same VAPID_PUBLIC_KEY from your backend .env file.

## 🐳 Docker Setup (Alternative)

If you prefer to run everything in Docker:

```bash
# Build and start all services
docker-compose -f infra/docker-compose.yml -f infra/docker-compose.app.yml up -d

# Wait for services to start, then run migrations
docker-compose exec backend npx prisma migrate dev
docker-compose exec backend npm run db:seed
```

## 🧪 Testing the Setup

### 1. Backend Health Check
```bash
curl http://localhost:4000/health
```
Should return: `{"status":"success","message":"Evently API is running!"}`

### 2. Database Connection
```bash
curl http://localhost:4000/api/events
```
Should return a list of sample events.

### 3. Frontend Connection
Visit http://localhost:3001 - you should see the Evently homepage.

### 4. API Documentation
Visit http://localhost:4000/api-docs - you should see Swagger UI.

## 🚨 Troubleshooting

### Backend won't start
1. **Database connection failed:**
   - Check if PostgreSQL is running: `pg_isready -h localhost -p 5433`
   - Verify DATABASE_URL in .env file
   - Run: `docker-compose up -d` to start Docker services

2. **Redis connection failed:**
   - Check if Redis is running: `redis-cli ping`
   - Should return: `PONG`

3. **Migration errors:**
   ```bash
   cd backend
   npx prisma migrate reset
   npx prisma migrate dev
   npm run db:seed
   ```

### Frontend won't start
1. **API connection failed:**
   - Verify NEXT_PUBLIC_API_URL in .env.local
   - Make sure backend is running on port 4000

2. **Build errors:**
   ```bash
   cd frontend
   rm -rf .next
   npm run dev
   ```

### Email notifications not working
1. **Gmail setup:**
   - Verify 2FA is enabled on your Google account
   - Use App Password, not regular password
   - Check EMAIL_USER and EMAIL_APP_PASSWORD in .env

2. **Test email service:**
   ```bash
   curl -X POST http://localhost:4000/api/test/email \
     -H "Content-Type: application/json"
   ```

### Push notifications not working
1. **VAPID keys missing:**
   ```bash
   cd backend
   npx web-push generate-vapid-keys
   ```
   Update both backend .env and frontend .env.local

2. **HTTPS required:**
   - Push notifications require HTTPS in production
   - For development, localhost works fine

## 📊 Production Deployment

### Backend Deployment (Railway/Render/Heroku)
1. Set environment variables in your hosting platform
2. Set NODE_ENV=production
3. Use production database URLs
4. Set up proper CORS origins
5. Use SendGrid or Mailgun for email in production

### Frontend Deployment (Vercel/Netlify)
1. Connect your GitHub repository
2. Set NEXT_PUBLIC_API_URL to your production backend URL
3. Set other environment variables

### Database (Production)
- Use managed PostgreSQL (Railway, Render, AWS RDS, etc.)
- Use managed Redis (Railway, Render, AWS ElastiCache, etc.)
- Run migrations in production: `npx prisma migrate deploy`

## 📚 Next Steps

1. **Customize the UI:** Edit frontend components in `frontend/src/components/`
2. **Add Features:** Extend the API by adding new routes in `backend/src/routes/`
3. **Configure Email Templates:** Modify templates in `backend/src/templates/`
4. **Set up Analytics:** Integrate with Google Analytics, Mixpanel, etc.
5. **Add Payment Processing:** Implement Stripe, PayPal, etc.

## 🎯 Quick Test Workflow

To verify everything is working:

1. **Register a user:** http://localhost:3001/register
2. **Create an event:** (Admin) POST /api/events
3. **Book tickets:** POST /api/bookings
4. **Check notifications:** Check your email and browser notifications
5. **Download ticket:** Click download button in My Bookings
6. **Join waitlist:** Try booking when event is full

## 🔗 Useful Links

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:4000
- **API Docs:** http://localhost:4000/api-docs
- **Health Check:** http://localhost:4000/health
- **Admin Analytics:** http://localhost:4000/api/admin/analytics/overview

---

**Need help?** Check the troubleshooting section above or create an issue on GitHub.
