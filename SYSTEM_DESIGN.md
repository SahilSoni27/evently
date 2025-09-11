# 🎯 Evently System Design Document

## Executive Summary

Evently is a scalable event booking platform designed to handle high-traffic scenarios with thousands of concurrent users booking tickets simultaneously. The system prioritizes **data consistency**, **scalability**, and **user experience** while maintaining **security** and **reliability**.

## 🎪 Problem Statement & Requirements

### Core Business Requirements
- **Event Management**: Create, manage, and display events with capacity controls
- **Ticket Booking**: Allow users to book tickets with real-time availability
- **Concurrency Handling**: Prevent double-booking and overselling
- **Waitlist System**: Queue management when events are sold out
- **Notifications**: Real-time alerts via email and push notifications
- **Admin Analytics**: Comprehensive reporting and user management
- **Scalability**: Handle traffic spikes during popular event launches

### Non-Functional Requirements
- **Performance**: <100ms API response times under normal load
- **Availability**: 99.9% uptime with graceful degradation
- **Scalability**: Support 10,000+ concurrent users and 1M+ events
- **Security**: Secure authentication, data protection, GDPR compliance
- **Reliability**: Data consistency and transaction integrity
- **Usability**: Mobile-responsive, accessible, intuitive interface

## 🏗️ Architecture Design Decisions

### 1. Technology Stack Selection

#### Backend: Node.js + Express.js + TypeScript
**Rationale:**
- **Performance**: V8 engine provides excellent I/O performance for API operations
- **Developer Productivity**: JavaScript/TypeScript across full stack reduces context switching
- **Ecosystem**: Rich npm ecosystem with mature libraries
- **Scalability**: Event-driven, non-blocking I/O perfect for high-concurrency scenarios
- **Real-time**: Native WebSocket support for live updates

**Trade-offs:**
- ✅ Fast development, excellent I/O performance, real-time capabilities
- ❌ Single-threaded (mitigated by clustering), memory usage for CPU-intensive tasks

#### Database: PostgreSQL + Prisma ORM
**Rationale:**
- **ACID Compliance**: Critical for financial transactions and booking consistency
- **Performance**: Advanced indexing, query optimization, and concurrent handling
- **Scalability**: Read replicas, connection pooling, and horizontal scaling options
- **JSON Support**: Native JSON columns for flexible data structures
- **Prisma Benefits**: Type-safe queries, automatic migrations, excellent developer experience

**Trade-offs:**
- ✅ Strong consistency, excellent performance, mature ecosystem
- ❌ More complex setup than NoSQL, requires more resources

#### Caching: Redis
**Rationale:**
- **Performance**: In-memory operations with sub-millisecond latency
- **Scalability**: Handles high read loads and session management
- **Features**: Pub/Sub for real-time updates, job queues, rate limiting
- **Persistence**: Optional durability for critical cached data

**Trade-offs:**
- ✅ Excellent performance, reduces database load, real-time capabilities
- ❌ Additional infrastructure complexity, memory costs

#### Frontend: Next.js + React + TypeScript
**Rationale:**
- **Performance**: Server-side rendering, automatic code splitting, optimized loading
- **SEO**: Server-side rendering crucial for event discovery
- **Developer Experience**: Hot reloading, TypeScript integration, comprehensive tooling
- **Ecosystem**: Large React ecosystem with extensive component libraries

**Trade-offs:**
- ✅ Excellent performance, SEO, developer productivity
- ❌ Bundle size, client-side hydration complexity

### 2. Architectural Patterns

#### Layered Architecture
```
┌─────────────────────────────────────┐
│         Presentation Layer          │ ← Next.js Frontend
├─────────────────────────────────────┤
│            API Layer                │ ← Express.js Routes
├─────────────────────────────────────┤
│         Business Logic Layer        │ ← Controllers & Services
├─────────────────────────────────────┤
│          Data Access Layer          │ ← Prisma ORM
├─────────────────────────────────────┤
│           Database Layer            │ ← PostgreSQL
└─────────────────────────────────────┘
```

**Benefits:**
- **Separation of Concerns**: Clear boundaries between layers
- **Maintainability**: Easy to modify individual layers
- **Testability**: Mock layers for unit testing
- **Reusability**: Business logic independent of presentation

#### Event-Driven Architecture (Asynchronous Processing)
```
API Request → Controller → Service → Event Queue → Background Worker
     ↓           ↓          ↓           ↓              ↓
  Response   Validation  Business    Redis Queue   Email/Push
             ↓          Logic       (BullMQ)      Notifications
         Database    ↓              ↓
         Updates  External APIs   Job Processing
```

**Benefits:**
- **Scalability**: Decouple heavy operations from API responses
- **Reliability**: Retry failed operations, dead letter queues
- **Performance**: Non-blocking operations for better user experience
- **Flexibility**: Easy to add new background processors

## 🔒 Concurrency & Race Condition Handling

### Challenge: Preventing Double Bookings
**Scenario**: Multiple users booking the last few tickets simultaneously.

### Solution 1: Database-Level Optimistic Locking
```typescript
// Optimistic locking with version field
const booking = await prisma.$transaction(async (tx) => {
  // Check current availability
  const event = await tx.event.findUnique({
    where: { id: eventId },
    select: { capacity: true, version: true, _count: { bookings: true } }
  });
  
  const availableCapacity = event.capacity - event._count.bookings;
  
  if (availableCapacity < requestedQuantity) {
    throw new Error('Insufficient capacity');
  }
  
  // Create booking with version check
  const newBooking = await tx.booking.create({
    data: { userId, eventId, quantity, totalPrice }
  });
  
  // Update event version (will fail if concurrent update occurred)
  await tx.event.update({
    where: { id: eventId, version: event.version },
    data: { version: { increment: 1 } }
  });
  
  return newBooking;
});
```

### Solution 2: Redis-Based Distributed Locking
```typescript
// Distributed lock for critical sections
const lockKey = `booking:${eventId}`;
const lock = await redis.set(lockKey, 'locked', 'PX', 5000, 'NX');

if (!lock) {
  throw new Error('Unable to acquire lock, please retry');
}

try {
  // Perform booking logic here
  const booking = await createBookingWithCapacityCheck(eventId, userId, quantity);
  return booking;
} finally {
  // Always release lock
  await redis.del(lockKey);
}
```

### Solution 3: Database Row-Level Locking
```typescript
const booking = await prisma.$transaction(async (tx) => {
  // Acquire exclusive lock on event row
  const event = await tx.$queryRaw`
    SELECT * FROM events WHERE id = ${eventId} FOR UPDATE
  `;
  
  // Check capacity with locked row
  const currentBookings = await tx.booking.count({
    where: { eventId, status: 'CONFIRMED' }
  });
  
  if (currentBookings + quantity > event.capacity) {
    throw new Error('Event is full');
  }
  
  // Create booking (safe because row is locked)
  return await tx.booking.create({
    data: { userId, eventId, quantity, totalPrice, status: 'CONFIRMED' }
  });
});
```

### Chosen Approach: Hybrid Strategy
**Implementation:**
1. **Application-level validation** for immediate feedback
2. **Database transactions** for consistency guarantees
3. **Optimistic locking** for high-concurrency scenarios
4. **Distributed locks** for critical operations requiring coordination

**Benefits:**
- ✅ Prevents overselling under all conditions
- ✅ Maintains high performance under normal load
- ✅ Graceful degradation under extreme load
- ✅ Clear error messages for users

## 📊 Scalability Architecture

### Horizontal Scaling Strategy

#### Load Balancer Configuration
```nginx
upstream backend {
    least_conn;
    server backend-1:4000 weight=3;
    server backend-2:4000 weight=3;
    server backend-3:4000 weight=2;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Database Scaling
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Write Master  │───▶│  Read Replica 1 │    │  Read Replica 2 │
│  (All Writes)   │    │  (Read Queries) │    │  (Read Queries) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Connection Pool      │
                    │      (PgBouncer)         │
                    └───────────────────────────┘
```

**Read/Write Splitting:**
```typescript
// Prisma configuration for read replicas
const readClient = new PrismaClient({
  datasources: { db: { url: READ_REPLICA_URL } }
});

const writeClient = new PrismaClient({
  datasources: { db: { url: MASTER_DB_URL } }
});

// Service layer handles routing
class EventService {
  async getEvents(filters) {
    return readClient.event.findMany(filters); // Read from replica
  }
  
  async createEvent(data) {
    return writeClient.event.create({ data }); // Write to master
  }
}
```

#### Caching Strategy
```typescript
// Multi-layer caching approach
class CacheService {
  // L1: Application memory cache (fastest)
  private memoryCache = new Map();
  
  // L2: Redis cache (fast, shared)
  private redisClient = new Redis(REDIS_URL);
  
  // L3: Database (slowest, source of truth)
  private db = prisma;
  
  async get(key: string) {
    // Try memory cache first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // Try Redis cache
    const cached = await this.redisClient.get(key);
    if (cached) {
      const data = JSON.parse(cached);
      this.memoryCache.set(key, data); // Populate L1
      return data;
    }
    
    // Fallback to database
    const data = await this.fetchFromDatabase(key);
    
    // Populate both caches
    await this.redisClient.setex(key, 300, JSON.stringify(data));
    this.memoryCache.set(key, data);
    
    return data;
  }
}
```

### Performance Optimizations

#### Database Indexing Strategy
```sql
-- Event discovery queries
CREATE INDEX CONCURRENTLY idx_events_category_time 
ON events(category, start_time) WHERE is_active = true;

-- User booking queries
CREATE INDEX CONCURRENTLY idx_bookings_user_status 
ON bookings(user_id, status) INCLUDE (event_id, created_at);

-- Waitlist management
CREATE INDEX CONCURRENTLY idx_waitlist_event_position 
ON waitlist(event_id, position) WHERE status = 'ACTIVE';

-- Notification delivery
CREATE INDEX CONCURRENTLY idx_notifications_user_unread 
ON notifications(user_id) WHERE read = false;
```

#### Query Optimization
```typescript
// Efficient event listing with capacity calculation
const eventsWithCapacity = await prisma.event.findMany({
  select: {
    id: true,
    name: true,
    venue: true,
    startTime: true,
    capacity: true,
    price: true,
    _count: {
      select: {
        bookings: {
          where: { status: 'CONFIRMED' }
        }
      }
    }
  },
  where: {
    startTime: { gte: new Date() },
    isActive: true
  },
  orderBy: { startTime: 'asc' }
});

// Transform to include available capacity
const eventsWithAvailability = eventsWithCapacity.map(event => ({
  ...event,
  availableCapacity: event.capacity - event._count.bookings,
  isFull: event._count.bookings >= event.capacity
}));
```

## 🔐 Security Architecture

### Authentication & Authorization

#### JWT Token Strategy
```typescript
// Secure JWT configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET, // 256-bit random key
  issuer: 'evently-api',
  audience: 'evently-users',
  expiresIn: '7d',
  algorithm: 'HS256'
};

// Token payload structure
interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}
```

#### Role-Based Access Control
```typescript
// Middleware for role-based authorization
const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Usage in routes
router.post('/events', requireAuth, requireRole(['ADMIN']), createEvent);
router.get('/bookings/my', requireAuth, getUserBookings);
```

### Input Validation & Sanitization
```typescript
// Comprehensive input validation with Zod
const createBookingSchema = z.object({
  eventId: z.string().cuid('Invalid event ID'),
  quantity: z.number().int().min(1).max(10, 'Maximum 10 tickets per booking'),
  specialRequests: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional()
});

// Validation middleware
const validateInput = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace with validated data
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors
      });
    }
  };
};
```

### Rate Limiting Strategy
```typescript
// Tiered rate limiting based on operation sensitivity
const rateLimitConfig = {
  // General API access
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // requests per window
    message: 'Too many requests from this IP'
  }),
  
  // Authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 login attempts per 15 minutes
    skipSuccessfulRequests: true
  }),
  
  // Booking operations (most restrictive)
  booking: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 booking attempts per minute
    keyGenerator: (req) => req.user?.id || req.ip
  })
};
```

## 📨 Notification System Architecture

### Multi-Channel Notification Strategy

#### Email Notifications
```typescript
// Template-based email system
class EmailService {
  private templates = {
    booking_confirmation: 'booking-confirmation.hbs',
    waitlist_notification: 'waitlist-notification.hbs',
    event_reminder: 'event-reminder.hbs'
  };
  
  async sendBookingConfirmation(booking: Booking) {
    const template = await this.loadTemplate('booking_confirmation');
    const qrCode = await this.generateQRCode(booking.id);
    
    const emailData = {
      userName: booking.user.name,
      eventName: booking.event.name,
      ticketNumber: booking.ticket.ticketNumber,
      qrCodeData: qrCode,
      venue: booking.event.venue,
      eventDate: booking.event.startTime
    };
    
    return this.sendEmail({
      to: booking.user.email,
      subject: `Booking Confirmed: ${booking.event.name}`,
      template: template,
      data: emailData,
      attachments: [{
        filename: 'ticket.pdf',
        content: await this.generateTicketPDF(booking)
      }]
    });
  }
}
```

#### Push Notifications
```typescript
// Web Push implementation with VAPID
class PushNotificationService {
  private webpush = require('web-push');
  
  constructor() {
    this.webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
  
  async sendToUser(userId: string, notification: NotificationData) {
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId }
    });
    
    if (!subscription) {
      console.log(`No push subscription for user ${userId}`);
      return;
    }
    
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: notification.data,
      actions: notification.actions
    });
    
    try {
      await this.webpush.sendNotification(subscription, payload);
    } catch (error) {
      if (error.statusCode === 410) {
        // Subscription expired, remove it
        await prisma.pushSubscription.delete({
          where: { userId }
        });
      }
      throw error;
    }
  }
}
```

### Background Job Processing
```typescript
// BullMQ job queue configuration
const notificationQueue = new Queue('notifications', {
  connection: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Job processor
const notificationWorker = new Worker('notifications', async (job) => {
  const { type, userId, data } = job.data;
  
  switch (type) {
    case 'booking_confirmation':
      await emailService.sendBookingConfirmation(data);
      await pushService.sendBookingConfirmation(userId, data);
      break;
      
    case 'waitlist_promotion':
      await emailService.sendWaitlistPromotion(data);
      await pushService.sendWaitlistPromotion(userId, data);
      break;
      
    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}, { connection: redisConfig });
```

## 📈 Analytics & Monitoring

### Application Performance Monitoring
```typescript
// Custom metrics collection
class MetricsCollector {
  private prometheus = require('prom-client');
  
  // Business metrics
  bookingCounter = new this.prometheus.Counter({
    name: 'bookings_total',
    help: 'Total number of bookings created',
    labelNames: ['status', 'event_category']
  });
  
  bookingDuration = new this.prometheus.Histogram({
    name: 'booking_duration_seconds',
    help: 'Time taken to complete booking',
    buckets: [0.1, 0.5, 1, 2, 5]
  });
  
  // System metrics
  requestDuration = new this.prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  });
  
  recordBooking(booking: Booking, duration: number) {
    this.bookingCounter.inc({
      status: booking.status,
      event_category: booking.event.category
    });
    
    this.bookingDuration.observe(duration);
  }
}
```

### Health Check System
```typescript
// Comprehensive health checks
class HealthCheckService {
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkEmailService(),
      this.checkExternalAPIs()
    ]);
    
    const results = {
      database: this.getCheckResult(checks[0]),
      redis: this.getCheckResult(checks[1]),
      email: this.getCheckResult(checks[2]),
      external: this.getCheckResult(checks[3]),
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION
    };
    
    const overallStatus = Object.values(results)
      .every(r => r.status === 'healthy') ? 'healthy' : 'degraded';
    
    return { status: overallStatus, checks: results };
  }
  
  private async checkDatabase(): Promise<CheckResult> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}
```

## 🎯 Major Design Decisions & Trade-offs

### 1. Consistency vs Availability (CAP Theorem)
**Decision**: Prioritize Consistency over Availability
**Rationale**: 
- Financial transactions require strong consistency
- Better to fail fast than allow double bookings
- Users prefer clear error messages over incorrect confirmations

**Implementation**:
- ACID database transactions for booking operations
- Distributed locks for critical sections
- Graceful degradation with clear error messages

### 2. Synchronous vs Asynchronous Processing
**Decision**: Hybrid approach - Sync for critical path, Async for notifications
**Rationale**:
- Booking confirmation must be immediate
- Email/push notifications can be delayed
- Better user experience with fast responses

**Implementation**:
```typescript
// Synchronous booking creation
const booking = await createBookingTransaction(eventId, userId, quantity);

// Asynchronous notification sending
await notificationQueue.add('booking_confirmation', {
  bookingId: booking.id,
  userId: userId
});

return { booking, message: 'Booking confirmed, confirmation email will arrive shortly' };
```

### 3. Microservices vs Monolith
**Decision**: Modular Monolith initially, with microservice-ready architecture
**Rationale**:
- Faster development and deployment for MVP
- Easier debugging and monitoring
- Clear module boundaries for future extraction
- Can evolve to microservices based on scaling needs

**Implementation**:
- Service layer abstraction for business logic
- Clear API boundaries between modules
- Separate data models and repositories
- Container-ready deployment

### 4. SQL vs NoSQL Database
**Decision**: PostgreSQL (SQL) for primary storage
**Rationale**:
- ACID transactions crucial for booking consistency
- Complex relational queries for analytics
- Strong ecosystem and tooling
- JSON support for flexible schemas when needed

**Trade-offs**:
- ✅ Strong consistency, complex queries, mature tooling
- ❌ More complex schema changes, scaling complexity

### 5. Server-Side vs Client-Side Rendering
**Decision**: Next.js with SSR for SEO-critical pages, CSR for interactive features
**Rationale**:
- Event discovery pages need SEO optimization
- User dashboard can be client-rendered for better interactivity
- Hybrid approach provides best of both worlds

**Implementation**:
```typescript
// SSR for public event pages
export async function getServerSideProps({ params }) {
  const event = await fetchEvent(params.id);
  return { props: { event } };
}

// CSR for user dashboard
export default function Dashboard() {
  const { data, loading } = useSWR('/api/bookings/my', fetcher);
  // Client-side rendering with loading states
}
```

## 🔮 Future Enhancements & Scalability

### Phase 2: Advanced Features
- **Machine Learning**: Demand prediction, dynamic pricing
- **Mobile Apps**: Native iOS/Android applications
- **Advanced Analytics**: Real-time dashboards, custom reports
- **Multi-tenant**: Support for multiple event organizers
- **Global Expansion**: Multi-currency, multi-language support

### Phase 3: Enterprise Features
- **White-label Solutions**: Customizable branding for clients
- **API Marketplace**: Public APIs for third-party integrations
- **Advanced Security**: SSO, SAML integration, audit logging
- **Compliance**: SOC2, GDPR, PCI-DSS certification
- **Global Scale**: Multi-region deployment, CDN optimization

### Scaling Roadmap
```
Current (MVP)     →    Phase 2          →    Phase 3
10K users            100K users             1M+ users
1K events/month      10K events/month       100K events/month
Single region        Multi-region           Global CDN
Monolith            Microservices          Service Mesh
```

This comprehensive system design provides a solid foundation for a scalable, secure, and performant event booking platform that can grow from thousands to millions of users while maintaining data integrity and excellent user experience. 🚀
