# 🏗️ Evently System Architecture

## High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser  │  Mobile PWA  │  Mobile Apps  │  Admin Dashboard │
│  (React/Next) │  (Service W) │  (Future)     │  (React/Next)    │
└─────────────────────────────────────────────────────────────────┘
                                │
                        ┌───────▼───────┐
                        │  Load Balancer │
                        │  (Cloudflare)  │
                        └───────┬───────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                   │
│  │   Frontend      │    │   Backend API   │                   │
│  │   (Next.js)     │◄──►│   (Express.js)  │                   │
│  │                 │    │                 │                   │
│  │ • User Interface│    │ • REST APIs     │                   │
│  │ • Authentication│    │ • Business Logic│                   │
│  │ • State Mgmt    │    │ • Authentication│                   │
│  │ • Push Notifications│ • Rate Limiting │                   │
│  └─────────────────┘    └─────────────────┘                   │
│                                  │                             │
└─────────────────────────────────────────────────────────────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
            ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CACHING       │    │  JOB QUEUE      │    │  NOTIFICATIONS  │
│   (Redis)       │    │  (BullMQ)       │    │  (Web Push +    │
│                 │    │                 │    │   Email)        │
│ • Session Store │    │ • Background    │    │                 │
│ • Rate Limits   │    │   Jobs          │    │ • Push Service  │
│ • Temp Data     │    │ • Email Queue   │    │ • Email Service │
│ • Pub/Sub       │    │ • Notifications │    │ • Templates     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
            │                      │                      │
            └──────────────────────┼──────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      DATA LAYER             │
                    ├─────────────────────────────┤
                    │     PostgreSQL Database     │
                    │                             │
                    │ • Users & Authentication    │
                    │ • Events & Venues          │
                    │ • Bookings & Tickets       │
                    │ • Waitlists                │
                    │ • Notifications History    │
                    │ • Payments & Refunds       │
                    │ • Analytics Data           │
                    └─────────────────────────────┘
```

## Component Architecture

### 🎨 Frontend Architecture (Next.js)

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── dashboard/         # User dashboard
│   │   ├── events/            # Event browsing
│   │   ├── bookings/          # Booking management
│   │   └── admin/             # Admin interface
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # Basic UI elements
│   │   ├── forms/             # Form components
│   │   └── layout/            # Layout components
│   ├── contexts/              # React contexts
│   │   ├── AuthContext        # Authentication state
│   │   └── NotificationContext # Notification state
│   ├── lib/                   # Utilities & helpers
│   │   ├── api.ts             # API client
│   │   ├── auth.ts            # Auth utilities
│   │   └── notifications.ts   # Push notification setup
│   └── types/                 # TypeScript definitions
```

**Key Features:**
- **Server-Side Rendering (SSR)** for SEO and performance
- **Client-Side Navigation** for smooth user experience
- **Real-time Updates** via WebSocket connections
- **Progressive Web App (PWA)** capabilities
- **Responsive Design** for mobile and desktop

### 🚀 Backend Architecture (Express.js + TypeScript)

```
backend/
├── src/
│   ├── controllers/           # Request handlers
│   │   ├── authController     # Authentication logic
│   │   ├── eventController    # Event management
│   │   ├── bookingController  # Booking operations
│   │   └── adminController    # Admin operations
│   ├── middleware/            # Express middleware
│   │   ├── auth.ts            # JWT authentication
│   │   ├── validation.ts      # Input validation
│   │   ├── rateLimiter.ts     # Rate limiting
│   │   └── errorHandler.ts    # Error handling
│   ├── routes/                # API route definitions
│   ├── services/              # Business logic layer
│   │   ├── emailService       # Email operations
│   │   ├── ticketService      # Ticket generation
│   │   └── notificationService # Push notifications
│   ├── lib/                   # Database & external services
│   │   ├── prisma.ts          # Database client
│   │   └── redis.ts           # Cache client
│   ├── workers/               # Background job processors
│   └── validation/            # Zod schemas
```

**Key Features:**
- **RESTful API Design** with consistent response formats
- **JWT Authentication** with role-based access control
- **Input Validation** using Zod schemas
- **Rate Limiting** to prevent abuse
- **Background Jobs** for scalable processing
- **Comprehensive Error Handling** with proper HTTP status codes

## 🗄️ Database Schema (PostgreSQL + Prisma)

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Users    │     │   Events    │     │  Bookings   │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │     │ id (PK)     │     │ id (PK)     │
│ email       │     │ name        │     │ userId (FK) │
│ name        │     │ description │     │ eventId(FK) │
│ password    │  ┌──│ venue       │  ┌──│ quantity    │
│ role        │  │  │ startTime   │  │  │ totalPrice  │
│ createdAt   │  │  │ endTime     │  │  │ status      │
│ updatedAt   │  │  │ capacity    │  │  │ bookedAt    │
└─────────────┘  │  │ price       │  │  │ createdAt   │
                 │  │ category    │  │  │ updatedAt   │
                 │  │ isActive    │  │  └─────────────┘
                 │  │ createdAt   │  │
                 │  │ updatedAt   │  │
                 │  └─────────────┘  │
                 │                   │
                 │  ┌─────────────┐  │
                 │  │  Waitlist   │  │
                 │  ├─────────────┤  │
                 │  │ id (PK)     │  │
                 └──│ userId (FK) │  │
                    │ eventId(FK) │──┘
                    │ position    │
                    │ status      │
                    │ joinedAt    │
                    │ notifiedAt  │
                    │ expiresAt   │
                    └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Tickets   │     │Notifications│     │Push Subscr. │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │     │ id (PK)     │     │ id (PK)     │
│ bookingId(FK│     │ userId (FK) │     │ userId (FK) │
│ ticketNumber│     │ type        │     │ endpoint    │
│ qrCode      │     │ title       │     │ p256dhKey   │
│ createdAt   │     │ message     │     │ authKey     │
│ updatedAt   │     │ data        │     │ createdAt   │
└─────────────┘     │ createdAt   │     │ updatedAt   │
                    │ sentAt      │     └─────────────┘
                    └─────────────┘
```

### Key Database Features

**Concurrency Control:**
- **Optimistic Locking** using version fields
- **Database Transactions** for atomic operations
- **Row-level Locking** for critical sections
- **Deadlock Detection** and retry mechanisms

**Performance Optimizations:**
- **Composite Indexes** on frequently queried columns
- **Connection Pooling** for efficient resource usage
- **Query Optimization** with proper JOIN strategies
- **Partial Indexes** for conditional queries

**Data Integrity:**
- **Foreign Key Constraints** to maintain relationships
- **Check Constraints** for business rule enforcement
- **Unique Constraints** to prevent duplicates
- **NOT NULL Constraints** for required fields

## 🔄 Job Queue Architecture (BullMQ + Redis)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Request   │───▶│   Job Queue     │───▶│  Job Processor  │
│                 │    │   (Redis)       │    │   (Worker)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Job Storage    │    │   Job Results   │
                       │  • Pending      │    │  • Completed    │
                       │  • Active       │    │  • Failed       │
                       │  • Delayed      │    │  • Retries      │
                       │  • Failed       │    │  • Logs         │
                       └─────────────────┘    └─────────────────┘
```

**Job Types:**
- **Email Notifications** - Welcome emails, booking confirmations
- **Push Notifications** - Real-time alerts and updates
- **Ticket Generation** - PDF creation and QR code generation
- **Waitlist Processing** - Position updates and promotions
- **Analytics Updates** - Metrics calculation and reporting
- **Cleanup Tasks** - Expired sessions and temporary data

## 🔐 Security Architecture

### Authentication & Authorization Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Backend   │    │  Database   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │ 1. Login Request │                  │
       ├─────────────────▶│                  │
       │                  │ 2. Verify Creds │
       │                  ├─────────────────▶│
       │                  │ 3. User Data     │
       │                  │◄─────────────────┤
       │ 4. JWT Token     │                  │
       │◄─────────────────┤                  │
       │                  │                  │
       │ 5. Authenticated │                  │
       │    Request       │                  │
       ├─────────────────▶│                  │
       │                  │ 6. Verify JWT    │
       │                  │ 7. Process Req   │
       │                  ├─────────────────▶│
       │                  │ 8. Response Data │
       │                  │◄─────────────────┤
       │ 9. API Response  │                  │
       │◄─────────────────┤                  │
```

**Security Layers:**

1. **Transport Security**
   - HTTPS/TLS encryption for all communications
   - Secure headers (HSTS, CSP, X-Frame-Options)
   - CORS configuration for cross-origin requests

2. **Authentication Security**
   - JWT tokens with secure signing algorithms
   - Bcrypt password hashing with salt rounds
   - Rate limiting on authentication endpoints
   - Account lockout after failed attempts

3. **Authorization Security**
   - Role-based access control (RBAC)
   - Resource-level permissions
   - Admin privilege checks
   - User-specific data isolation

4. **Input Security**
   - Zod schema validation for all inputs
   - SQL injection prevention via Prisma ORM
   - XSS protection through sanitization
   - File upload validation and limits

## 📊 Monitoring & Observability

### Metrics Collection

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Application    │───▶│   Metrics       │───▶│   Monitoring    │
│  (Express.js)   │    │  Collection     │    │   Dashboard     │
│                 │    │  (Prometheus)   │    │   (Grafana)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Logs        │    │   Tracing       │    │    Alerts       │
│   (Winston)     │    │   (OpenTel)     │    │   (Slack/PD)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Key Metrics:**
- **Request Metrics** - Response times, status codes, throughput
- **Database Metrics** - Query performance, connection pool usage
- **Business Metrics** - Booking rates, conversion rates, revenue
- **System Metrics** - CPU, memory, disk usage, error rates

## 🚀 Scalability Considerations

### Horizontal Scaling Strategy

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (Nginx/ALB)   │
                    └─────────┬───────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │   Backend     │ │   Backend     │ │   Backend     │
    │  Instance 1   │ │  Instance 2   │ │  Instance 3   │
    └───────────────┘ └───────────────┘ └───────────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
                    ┌─────────▼───────┐
                    │   Shared Cache  │
                    │     (Redis)     │
                    └─────────────────┘
                              │
                    ┌─────────▼───────┐
                    │    Database     │
                    │  (PostgreSQL)   │
                    └─────────────────┘
```

**Scaling Strategies:**

1. **Application Scaling**
   - Multiple backend instances behind load balancer
   - Stateless application design
   - Session storage in Redis
   - Horizontal pod autoscaling in Kubernetes

2. **Database Scaling**
   - Read replicas for query distribution
   - Connection pooling (PgBouncer)
   - Partitioning for large tables
   - Sharding for extreme scale

3. **Cache Scaling**
   - Redis cluster for high availability
   - CDN for static asset delivery
   - Application-level caching
   - Database query result caching

## 🔄 Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                        PRODUCTION                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │     CDN     │    │ Load Balancer│   │   Firewall  │     │
│  │(CloudFlare) │    │  (AWS ALB)   │   │   (WAF)     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                   │                   │          │
│         └───────────────────┼───────────────────┘          │
│                             │                              │
│  ┌──────────────────────────┼──────────────────────────┐   │
│  │              VPC / Private Network               │   │
│  │                          │                       │   │
│  │  ┌─────────────┐    ┌─────────────┐              │   │
│  │  │  Frontend   │    │   Backend   │              │   │
│  │  │  (Vercel)   │    │ (ECS/EKS)   │              │   │
│  │  └─────────────┘    └─────────────┘              │   │
│  │                          │                       │   │
│  │  ┌─────────────┐    ┌─────────────┐              │   │
│  │  │    Redis    │    │ PostgreSQL  │              │   │
│  │  │(ElastiCache)│    │    (RDS)    │              │   │
│  │  └─────────────┘    └─────────────┘              │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

This architecture provides:
- **High Availability** with multiple availability zones
- **Auto Scaling** based on traffic patterns
- **Security** with VPC, firewalls, and encryption
- **Monitoring** with comprehensive observability stack
- **Disaster Recovery** with automated backups and failover

---

**This architecture is designed to handle millions of users and thousands of concurrent bookings while maintaining high availability and security.** 🚀
