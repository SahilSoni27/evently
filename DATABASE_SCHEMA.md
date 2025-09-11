# 🗄️ Evently Database Schema & Entity-Relationship Diagram

## Entity-Relationship Diagram

```
                                    EVENTLY DATABASE SCHEMA
                                   ═══════════════════════════

                    ┌─────────────────────────────────────────────────────────────┐
                    │                        USERS                                │
                    ├─────────────────────────────────────────────────────────────┤
                    │ id: String @id @default(cuid())                            │
                    │ email: String @unique                                       │
                    │ name: String?                                               │
                    │ password: String                                            │
                    │ role: UserRole @default(USER)                              │
                    │ createdAt: DateTime @default(now())                        │
                    │ updatedAt: DateTime @updatedAt                             │
                    └─────────────────────────────────────────────────────────────┘
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      │                       │                       │
                      ▼                       ▼                       ▼
        ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
        │        BOOKINGS         │ │        WAITLIST         │ │   PUSH_SUBSCRIPTIONS    │
        ├─────────────────────────┤ ├─────────────────────────┤ ├─────────────────────────┤
        │ id: String @id          │ │ id: String @id          │ │ id: String @id          │
        │ userId: String          │ │ userId: String          │ │ userId: String @unique  │
        │ eventId: String         │ │ eventId: String         │ │ endpoint: String        │
        │ quantity: Int           │ │ position: Int           │ │ p256dhKey: String       │
        │ totalPrice: Decimal     │ │ status: WaitlistStatus  │ │ authKey: String         │
        │ status: BookingStatus   │ │ joinedAt: DateTime      │ │ createdAt: DateTime     │
        │ bookedAt: DateTime      │ │ notifiedAt: DateTime?   │ │ updatedAt: DateTime     │
        │ createdAt: DateTime     │ │ expiresAt: DateTime?    │ └─────────────────────────┘
        │ updatedAt: DateTime     │ │ createdAt: DateTime     │
        └─────────────────────────┘ │ updatedAt: DateTime     │
                      │             └─────────────────────────┘
                      │                       │
                      │                       │
                      ▼                       │
        ┌─────────────────────────┐           │
        │        TICKETS          │           │
        ├─────────────────────────┤           │
        │ id: String @id          │           │
        │ bookingId: String @uniq │           │
        │ ticketNumber: String    │           │
        │ qrCode: String          │           │
        │ createdAt: DateTime     │           │
        │ updatedAt: DateTime     │           │
        └─────────────────────────┘           │
                                              │
                    ┌─────────────────────────────────────────────────────────────┐
                    │                        EVENTS                               │
                    ├─────────────────────────────────────────────────────────────┤
                    │ id: String @id @default(cuid())                            │
                    │ name: String                                                │
                    │ description: String?                                        │
                    │ venue: String                                               │
                    │ startTime: DateTime                                         │
                    │ endTime: DateTime?                                          │
                    │ capacity: Int                                               │
                    │ price: Decimal                                              │
                    │ category: EventCategory @default(OTHER)                    │
                    │ imageUrl: String?                                           │
                    │ isActive: Boolean @default(true)                           │
                    │ createdAt: DateTime @default(now())                        │
                    │ updatedAt: DateTime @updatedAt                             │
                    └─────────────────┬───────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼───────────────────┐
                    │                 │                   │
                    ▼                 ▼                   ▼
      ┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────┐
      │      BOOKINGS       │ │    WAITLIST     │ │   VENUE (ext)   │
      │    (references)     │ │  (references)   │ │   (future)      │
      └─────────────────────┘ └─────────────────┘ └─────────────────┘


                    ┌─────────────────────────────────────────────────────────────┐
                    │                   NOTIFICATIONS                             │
                    ├─────────────────────────────────────────────────────────────┤
                    │ id: String @id @default(cuid())                            │
                    │ userId: String                                              │
                    │ type: String                                                │
                    │ title: String                                               │
                    │ message: String                                             │
                    │ data: Json?                                                 │
                    │ read: Boolean @default(false)                              │
                    │ createdAt: DateTime @default(now())                        │
                    │ sentAt: DateTime?                                           │
                    └─────────────────────────────────────────────────────────────┘
                                              │
                                              │ (belongs to)
                                              ▼
                                     ┌───────────────┐
                                     │     USERS     │
                                     │  (reference)  │
                                     └───────────────┘


        ┌─────────────────────────────────────────────────────────────────────────┐
        │                          ADVANCED FEATURES                              │
        └─────────────────────────────────────────────────────────────────────────┘

        ┌─────────────────────────┐           ┌─────────────────────────┐
        │         VENUES          │           │      VENUE_SECTIONS     │
        ├─────────────────────────┤◄─────────►├─────────────────────────┤
        │ id: String @id          │           │ id: String @id          │
        │ name: String            │           │ venueId: String         │
        │ address: String?        │           │ name: String            │
        │ capacity: Int           │           │ capacity: Int           │
        │ description: String?    │           │ priceMultiplier: Dec    │
        │ layout: Json?           │           │ createdAt: DateTime     │
        │ createdAt: DateTime     │           │ updatedAt: DateTime     │
        │ updatedAt: DateTime     │           └─────────────────────────┘
        └─────────────────────────┘                       │
                      │                                   │
                      │                                   ▼
                      │                   ┌─────────────────────────┐
                      │                   │         SEATS           │
                      │                   ├─────────────────────────┤
                      │                   │ id: String @id          │
                      │                   │ sectionId: String       │
                      │                   │ seatNumber: String      │
                      │                   │ row: String             │
                      │                   │ isAvailable: Boolean    │
                      │                   │ createdAt: DateTime     │
                      │                   │ updatedAt: DateTime     │
                      │                   └─────────────────────────┘
                      │                             │
                      │                             │
                      ▼                             ▼
        ┌─────────────────────────┐           ┌─────────────────────────┐
        │    EVENT_VENUES         │           │     SEAT_BOOKINGS       │
        ├─────────────────────────┤           ├─────────────────────────┤
        │ eventId: String         │           │ id: String @id          │
        │ venueId: String         │           │ bookingId: String       │
        │ @@id([eventId,venueId]) │           │ seatId: String          │
        └─────────────────────────┘           │ createdAt: DateTime     │
                                              └─────────────────────────┘
```

## Detailed Entity Descriptions

### 👤 Users Entity

**Purpose:** Store user account information and authentication data.

| Field     | Type     | Description                | Constraints         |
| --------- | -------- | -------------------------- | ------------------- |
| id        | String   | Unique user identifier     | Primary Key, CUID   |
| email     | String   | User's email address       | Unique, Required    |
| name      | String?  | User's display name        | Optional            |
| password  | String   | Hashed password (bcrypt)   | Required, Hashed    |
| role      | UserRole | User role (USER/ADMIN)     | Enum, Default: USER |
| createdAt | DateTime | Account creation timestamp | Auto-generated      |
| updatedAt | DateTime | Last update timestamp      | Auto-updated        |

**Relationships:**

- **One-to-Many** with Bookings (user can have multiple bookings)
- **One-to-Many** with Waitlist (user can join multiple waitlists)
- **One-to-One** with PushSubscriptions (one push subscription per user)
- **One-to-Many** with Notifications (user receives multiple notifications)

### 🎪 Events Entity

**Purpose:** Store event information including scheduling and capacity details.

| Field       | Type          | Description              | Constraints          |
| ----------- | ------------- | ------------------------ | -------------------- |
| id          | String        | Unique event identifier  | Primary Key, CUID    |
| name        | String        | Event name/title         | Required             |
| description | String?       | Event description        | Optional, Text       |
| venue       | String        | Event venue/location     | Required             |
| startTime   | DateTime      | Event start date/time    | Required             |
| endTime     | DateTime?     | Event end date/time      | Optional             |
| capacity    | Int           | Maximum attendees        | Required, Positive   |
| price       | Decimal       | Ticket price             | Required, >= 0       |
| category    | EventCategory | Event category           | Enum, Default: OTHER |
| imageUrl    | String?       | Event image URL          | Optional, URL        |
| isActive    | Boolean       | Event availability flag  | Default: true        |
| createdAt   | DateTime      | Event creation timestamp | Auto-generated       |
| updatedAt   | DateTime      | Last update timestamp    | Auto-updated         |

**Relationships:**

- **One-to-Many** with Bookings (event can have multiple bookings)
- **One-to-Many** with Waitlist (event can have waitlist entries)
- **Many-to-Many** with Venues (via EventVenues junction table)

### 🎫 Bookings Entity

**Purpose:** Store ticket booking information and transaction details.

| Field      | Type          | Description               | Constraints           |
| ---------- | ------------- | ------------------------- | --------------------- |
| id         | String        | Unique booking identifier | Primary Key, CUID     |
| userId     | String        | Reference to user         | Foreign Key, Required |
| eventId    | String        | Reference to event        | Foreign Key, Required |
| quantity   | Int           | Number of tickets booked  | Required, 1-10        |
| totalPrice | Decimal       | Total booking amount      | Required, >= 0        |
| status     | BookingStatus | Booking status            | Enum, Required        |
| bookedAt   | DateTime      | Booking timestamp         | Required              |
| createdAt  | DateTime      | Record creation timestamp | Auto-generated        |
| updatedAt  | DateTime      | Last update timestamp     | Auto-updated          |

**Relationships:**

- **Many-to-One** with Users (user can have multiple bookings)
- **Many-to-One** with Events (event can have multiple bookings)
- **One-to-One** with Tickets (each booking generates one ticket)
- **One-to-Many** with SeatBookings (for seat-level bookings)

### 🎟️ Tickets Entity

**Purpose:** Store generated ticket information including QR codes.

| Field        | Type     | Description                   | Constraints         |
| ------------ | -------- | ----------------------------- | ------------------- |
| id           | String   | Unique ticket identifier      | Primary Key, CUID   |
| bookingId    | String   | Reference to booking          | Foreign Key, Unique |
| ticketNumber | String   | Human-readable ticket number  | Unique, Required    |
| qrCode       | String   | QR code data for verification | Required            |
| createdAt    | DateTime | Ticket generation timestamp   | Auto-generated      |
| updatedAt    | DateTime | Last update timestamp         | Auto-updated        |

**Relationships:**

- **One-to-One** with Bookings (each booking has one ticket)

### ⏳ Waitlist Entity

**Purpose:** Manage waiting queues for sold-out events.

| Field      | Type           | Description                | Constraints           |
| ---------- | -------------- | -------------------------- | --------------------- |
| id         | String         | Unique waitlist identifier | Primary Key, CUID     |
| userId     | String         | Reference to user          | Foreign Key, Required |
| eventId    | String         | Reference to event         | Foreign Key, Required |
| position   | Int            | Position in waitlist queue | Required, Positive    |
| status     | WaitlistStatus | Waitlist entry status      | Enum, Default: ACTIVE |
| joinedAt   | DateTime       | When user joined waitlist  | Required              |
| notifiedAt | DateTime?      | When user was notified     | Optional              |
| expiresAt  | DateTime?      | When notification expires  | Optional              |
| createdAt  | DateTime       | Record creation timestamp  | Auto-generated        |
| updatedAt  | DateTime       | Last update timestamp      | Auto-updated          |

**Relationships:**

- **Many-to-One** with Users (user can join multiple waitlists)
- **Many-to-One** with Events (event can have multiple waitlist entries)

**Unique Constraint:** `@@unique([userId, eventId])` - User can only join waitlist once per event

### 🔔 Notifications Entity

**Purpose:** Store notification history and delivery status.

| Field     | Type      | Description                    | Constraints           |
| --------- | --------- | ------------------------------ | --------------------- |
| id        | String    | Unique notification identifier | Primary Key, CUID     |
| userId    | String    | Reference to user              | Foreign Key, Required |
| type      | String    | Notification type/category     | Required              |
| title     | String    | Notification title             | Required              |
| message   | String    | Notification message content   | Required              |
| data      | Json?     | Additional structured data     | Optional, JSON        |
| read      | Boolean   | Read status flag               | Default: false        |
| createdAt | DateTime  | Notification creation time     | Auto-generated        |
| sentAt    | DateTime? | When notification was sent     | Optional              |

**Relationships:**

- **Many-to-One** with Users (user receives multiple notifications)

### 📱 PushSubscriptions Entity

**Purpose:** Store web push notification subscription data.

| Field     | Type     | Description                       | Constraints         |
| --------- | -------- | --------------------------------- | ------------------- |
| id        | String   | Unique subscription identifier    | Primary Key, CUID   |
| userId    | String   | Reference to user                 | Foreign Key, Unique |
| endpoint  | String   | Push service endpoint URL         | Required            |
| p256dhKey | String   | Public key for message encryption | Required            |
| authKey   | String   | Authentication secret             | Required            |
| createdAt | DateTime | Subscription creation time        | Auto-generated      |
| updatedAt | DateTime | Last update timestamp             | Auto-updated        |

**Relationships:**

- **One-to-One** with Users (one push subscription per user)

## Advanced Schema Features

### 🏢 Venues Entity (Extended)

**Purpose:** Detailed venue information for advanced event management.

| Field       | Type     | Description                | Constraints        |
| ----------- | -------- | -------------------------- | ------------------ |
| id          | String   | Unique venue identifier    | Primary Key, CUID  |
| name        | String   | Venue name                 | Required           |
| address     | String?  | Venue address              | Optional           |
| capacity    | Int      | Total venue capacity       | Required, Positive |
| description | String?  | Venue description          | Optional           |
| layout      | Json?    | Venue layout configuration | Optional, JSON     |
| createdAt   | DateTime | Venue creation timestamp   | Auto-generated     |
| updatedAt   | DateTime | Last update timestamp      | Auto-updated       |

### 🎭 VenueSections Entity

**Purpose:** Divide venues into sections with different pricing.

| Field           | Type     | Description                  | Constraints           |
| --------------- | -------- | ---------------------------- | --------------------- |
| id              | String   | Unique section identifier    | Primary Key, CUID     |
| venueId         | String   | Reference to venue           | Foreign Key, Required |
| name            | String   | Section name (e.g., "VIP")   | Required              |
| capacity        | Int      | Section capacity             | Required, Positive    |
| priceMultiplier | Decimal  | Price multiplier for section | Default: 1.0          |
| createdAt       | DateTime | Section creation timestamp   | Auto-generated        |
| updatedAt       | DateTime | Last update timestamp        | Auto-updated          |

### 💺 Seats Entity

**Purpose:** Individual seat management for detailed bookings.

| Field       | Type     | Description                | Constraints           |
| ----------- | -------- | -------------------------- | --------------------- |
| id          | String   | Unique seat identifier     | Primary Key, CUID     |
| sectionId   | String   | Reference to venue section | Foreign Key, Required |
| seatNumber  | String   | Seat number/identifier     | Required              |
| row         | String   | Row identifier             | Required              |
| isAvailable | Boolean  | Seat availability flag     | Default: true         |
| createdAt   | DateTime | Seat creation timestamp    | Auto-generated        |
| updatedAt   | DateTime | Last update timestamp      | Auto-updated          |

### 🎯 SeatBookings Entity

**Purpose:** Track individual seat reservations.

| Field     | Type     | Description                    | Constraints           |
| --------- | -------- | ------------------------------ | --------------------- |
| id        | String   | Unique seat booking identifier | Primary Key, CUID     |
| bookingId | String   | Reference to main booking      | Foreign Key, Required |
| seatId    | String   | Reference to specific seat     | Foreign Key, Required |
| createdAt | DateTime | Seat booking timestamp         | Auto-generated        |

## Enumeration Types

### UserRole

```typescript
enum UserRole {
  USER    // Regular user - can book tickets
  ADMIN   // Administrator - full system access
}
```

### BookingStatus

```typescript
enum BookingStatus {
  CONFIRMED  // Booking confirmed and paid
  CANCELLED  // Booking cancelled by user/admin
  PENDING    // Booking pending payment/confirmation
}
```

### WaitlistStatus

```typescript
enum WaitlistStatus {
  ACTIVE    // Active in waitlist queue
  NOTIFIED  // User has been notified of availability
  EXPIRED   // Notification window has expired
}
```

### EventCategory

```typescript
enum EventCategory {
  CONFERENCE     // Business conferences
  WORKSHOP       // Educational workshops
  NETWORKING     // Networking events
  SOCIAL         // Social gatherings
  BUSINESS       // Business meetings
  ENTERTAINMENT  // Entertainment events
  SPORTS         // Sports events
  EDUCATION      // Educational seminars
  CULTURAL       // Cultural events
  OTHER          // Other event types
}
```

## Database Constraints & Indexes

### Primary Keys

- All entities use CUID (Collision-resistant Unique Identifier) for primary keys
- CUIDs are URL-safe, sortable, and provide better performance than UUIDs

### Foreign Key Constraints

```sql
-- User relationships
ALTER TABLE bookings ADD CONSTRAINT fk_booking_user
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE waitlist ADD CONSTRAINT fk_waitlist_user
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- Event relationships
ALTER TABLE bookings ADD CONSTRAINT fk_booking_event
  FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE waitlist ADD CONSTRAINT fk_waitlist_event
  FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE;

-- Booking relationships
ALTER TABLE tickets ADD CONSTRAINT fk_ticket_booking
  FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE;
```

### Performance Indexes

```sql
-- Frequently queried fields
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_active ON events(is_active);

-- User-related queries
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Waitlist management
CREATE INDEX idx_waitlist_event_position ON waitlist(event_id, position);
CREATE INDEX idx_waitlist_status ON waitlist(status);

-- Notification delivery
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

### Unique Constraints

```sql
-- Business rules
ALTER TABLE users ADD CONSTRAINT unique_user_email UNIQUE (email);
ALTER TABLE tickets ADD CONSTRAINT unique_ticket_booking UNIQUE (booking_id);
ALTER TABLE tickets ADD CONSTRAINT unique_ticket_number UNIQUE (ticket_number);
ALTER TABLE waitlist ADD CONSTRAINT unique_user_event_waitlist UNIQUE (user_id, event_id);
ALTER TABLE push_subscriptions ADD CONSTRAINT unique_user_subscription UNIQUE (user_id);
```

### Check Constraints

```sql
-- Data validation
ALTER TABLE events ADD CONSTRAINT check_capacity_positive
  CHECK (capacity > 0);

ALTER TABLE events ADD CONSTRAINT check_price_non_negative
  CHECK (price >= 0);

ALTER TABLE bookings ADD CONSTRAINT check_quantity_valid
  CHECK (quantity > 0 AND quantity <= 10);

ALTER TABLE waitlist ADD CONSTRAINT check_position_positive
  CHECK (position > 0);
```

## Concurrency Control

### Optimistic Locking

```sql
-- Version-based optimistic locking for critical updates
ALTER TABLE bookings ADD COLUMN version INT DEFAULT 1;
ALTER TABLE events ADD COLUMN version INT DEFAULT 1;

-- Update trigger to increment version
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_version_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION increment_version();
```

### Row-Level Locking

```sql
-- Example: Secure booking creation with row locking
BEGIN TRANSACTION;

-- Lock the event row to prevent concurrent capacity issues
SELECT capacity FROM events WHERE id = $eventId FOR UPDATE;

-- Check current bookings
SELECT COUNT(*) as current_bookings
FROM bookings
WHERE event_id = $eventId AND status = 'CONFIRMED';

-- Proceed with booking if capacity available
-- ... booking logic here ...

COMMIT;
```

## Data Migration Considerations

### Schema Evolution

- **Backward Compatibility:** New columns should be nullable or have defaults
- **Index Creation:** Create indexes concurrently to avoid downtime
- **Foreign Key Addition:** Add constraints with validation checks
- **Data Type Changes:** Use safe migrations with intermediate columns

### Performance Monitoring

- **Query Performance:** Monitor slow queries and optimize indexes
- **Connection Pool:** Configure appropriate pool sizes for load
- **Vacuum Strategy:** Regular maintenance for PostgreSQL performance
- **Backup Strategy:** Automated backups with point-in-time recovery

This comprehensive database schema supports all current features and provides extensibility for future enhancements while maintaining data integrity and performance at scale. 🚀
