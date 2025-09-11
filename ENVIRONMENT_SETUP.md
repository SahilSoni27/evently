# 🔧 Manual Environment Configuration Guide

This guide covers all the environment variables you need to manually update for the Evently system to work properly.

## ⚠️ CRITICAL: Required Manual Updates

### 🔐 1. Backend Environment (.env)

Copy `backend/.env.example` to `backend/.env` and update these values:

#### JWT Secret (CRITICAL for security)
```env
JWT_SECRET="your-super-secret-jwt-key-change-in-production-make-it-very-strong"
```
**❗ Action Required:** Replace with a strong 64+ character random string. Use a password generator.

#### VAPID Keys for Push Notifications
```env
VAPID_PUBLIC_KEY="BDjDt9G6Z155-xfDDzHgMtNgXVas96Q25SoXYWurNhZhoAQzj2TdyUCxFbp8_4kc26WLw1p1lDiHCoyXmC4kaQw"
VAPID_PRIVATE_KEY="zCxQMkIR8_kEi7Ya1zJNny_IH-i4YTqFD9U5jyW_x6g"
VAPID_EMAIL="sahillsonii45@gmail.com"
```
**❗ Action Required:** 
1. Generate new keys: `cd backend && npx web-push generate-vapid-keys`
2. Copy the output to your .env file
3. Update VAPID_EMAIL with your actual email

#### Email Configuration (Choose ONE option)

**Option A: Gmail (Recommended for development)**
```env
EMAIL_SERVICE="gmail"
EMAIL_USER="your-email@gmail.com"
EMAIL_APP_PASSWORD="your-gmail-app-password"
```
**❗ Action Required:**
1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to "Security" → "App passwords"
4. Generate an app password for "Mail"
5. Use the generated password (16 characters, not your regular password)

**Option B: Ethereal (Testing - fake emails)**
```env
EMAIL_SERVICE="ethereal"
```
**❗ Action Required:** No changes needed. Emails will be viewable at https://ethereal.email/

**Option C: SendGrid (Production)**
```env
EMAIL_SERVICE="sendgrid"
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
```
**❗ Action Required:**
1. Sign up at https://sendgrid.com/
2. Create an API key in Settings → API Keys
3. Verify your sender identity

### 🔐 2. Frontend Environment (.env.local)

Copy `frontend/.env.example` to `frontend/.env.local` and update:

#### API URL
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```
**❗ Action Required:** Update if your backend runs on a different port.

#### VAPID Public Key
```env
NEXT_PUBLIC_VAPID_KEY="BDjDt9G6Z155-xfDDzHgMtNgXVas96Q25SoXYWurNhZhoAQzj2TdyUCxFbp8_4kc26WLw1p1lDiHCoyXmC4kaQw"
```
**❗ Action Required:** Copy the VAPID_PUBLIC_KEY from your backend .env file.

## 🛠️ Step-by-Step Setup

### Step 1: Generate VAPID Keys
```bash
cd backend
npx web-push generate-vapid-keys
```
Copy the output for use in both backend and frontend.

### Step 2: Set up Gmail App Password
1. Go to https://myaccount.google.com/
2. Click "Security" in the left sidebar
3. Under "Signing in to Google", click "App passwords"
4. If you don't see this option, enable 2-Step Verification first
5. Select "Mail" and generate password
6. Copy the 16-character password to your .env file

### Step 3: Update Backend .env
```env
# Database (should work with Docker setup)
DATABASE_URL="postgresql://evently_user:evently_pass@localhost:5433/evently_db?schema=public"

# Redis (should work with Docker setup) 
REDIS_URL="redis://localhost:6379"

# JWT (CHANGE THIS)
JWT_SECRET="your-super-secret-jwt-key-change-in-production-make-it-very-strong"
JWT_EXPIRES_IN="7d"

# Server
PORT=4000
NODE_ENV="development"
API_URL="http://localhost:3001"

# Email (UPDATE WITH YOUR GMAIL)
EMAIL_SERVICE="gmail"
EMAIL_USER="your-email@gmail.com"
EMAIL_APP_PASSWORD="your-gmail-app-password"
EMAIL_FROM_NAME="Evently"
EMAIL_FROM_ADDRESS="noreply@evently.com"

# Push Notifications (UPDATE WITH GENERATED KEYS)
VAPID_PUBLIC_KEY="your-generated-public-key"
VAPID_PRIVATE_KEY="your-generated-private-key"
VAPID_EMAIL="your-email@gmail.com"

# Background Jobs
ENABLE_WORKERS="true"
```

### Step 4: Update Frontend .env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_VAPID_KEY=your-generated-public-key
NEXT_PUBLIC_APP_NAME=Evently
NEXT_PUBLIC_APP_DESCRIPTION="Scalable Event Booking Platform"
```

## 🧪 Testing Your Configuration

### Test Backend Configuration
```bash
# Test database connection
curl http://localhost:4000/health

# Test email service (if configured)
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'

# Test VAPID keys
curl http://localhost:4000/api/notifications/vapid-key
```

### Test Frontend Configuration
1. Visit http://localhost:3001
2. Try registering a new account
3. Check if you can see events
4. Test booking functionality

## 🚨 Common Issues & Solutions

### Issue: "Database connection failed"
**Solution:** Make sure PostgreSQL is running:
```bash
cd infra
docker-compose up -d
```

### Issue: "Redis connection failed"
**Solution:** Make sure Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Issue: "Email not sending"
**Solutions:**
1. **Gmail:** Verify you're using App Password, not regular password
2. **2FA:** Enable 2-Factor Authentication on your Google account
3. **Test:** Use Ethereal email service for testing: `EMAIL_SERVICE="ethereal"`

### Issue: "Push notifications not working"
**Solutions:**
1. **Generate keys:** `npx web-push generate-vapid-keys`
2. **Match keys:** Ensure VAPID_PUBLIC_KEY in backend matches NEXT_PUBLIC_VAPID_KEY in frontend
3. **HTTPS:** Push notifications require HTTPS in production (localhost works for development)

### Issue: "Frontend can't connect to backend"
**Solutions:**
1. **Check ports:** Backend on 4000, Frontend on 3001
2. **CORS:** Verify CORS settings in backend allow frontend URL
3. **Environment:** Check NEXT_PUBLIC_API_URL points to correct backend URL

## ✅ Verification Checklist

- [ ] JWT_SECRET is a strong random string (64+ characters)
- [ ] VAPID keys generated and set in both backend and frontend
- [ ] Email service configured (Gmail App Password or Ethereal)
- [ ] Database URL points to running PostgreSQL instance
- [ ] Redis URL points to running Redis instance
- [ ] Frontend API URL matches backend location
- [ ] All services start without errors
- [ ] Test user registration works
- [ ] Test event creation/booking works
- [ ] Email notifications are received
- [ ] Push notifications work in browser

## 🔄 Quick Reset

If you need to start over:

```bash
# Reset backend
cd backend
rm .env
cp .env.example .env
# Edit .env with your values
npm run db:reset
npm run db:seed

# Reset frontend
cd frontend
rm .env.local
cp .env.example .env.local
# Edit .env.local with your values
rm -rf .next
npm run dev
```

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Make sure all services (PostgreSQL, Redis) are running
4. Check the logs for specific error messages

---

**Once you've completed all manual updates, your Evently system should be fully functional!** 🎉
