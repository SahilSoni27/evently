# 📡 Evently API Documentation

## Overview

The Evently API is a RESTful service built with Node.js, Express, and TypeScript. It provides comprehensive endpoints for event management, booking operations, user authentication, and real-time notifications.

**Base URL**: `http://localhost:4000/api` (Development)  
**Production URL**: `https://your-domain.com/api`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "clxyz123...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login User

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "clxyz123...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Get User Profile

```http
GET /api/auth/profile
Authorization: Bearer <token>
```

## Event Management

### List Events

```http
GET /api/events?page=1&limit=10&search=conference&sortBy=startTime&sortOrder=asc
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search in event name, description, venue
- `sortBy` (optional): Sort field - startTime, name, price, capacity
- `sortOrder` (optional): asc or desc

**Response:**

```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "id": "clxyz789...",
        "name": "Tech Conference 2025",
        "description": "Annual technology conference",
        "venue": "Convention Center",
        "startTime": "2025-03-15T09:00:00Z",
        "endTime": "2025-03-15T18:00:00Z",
        "capacity": 500,
        "availableCapacity": 450,
        "price": 99.99,
        "category": "CONFERENCE",
        "imageUrl": "https://example.com/image.jpg",
        "createdAt": "2025-01-01T00:00:00Z",
        "bookingsCount": 50
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 47,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Get Single Event

```http
GET /api/events/{eventId}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "event": {
      "id": "clxyz789...",
      "name": "Tech Conference 2025",
      "description": "Annual technology conference with industry leaders",
      "venue": "Downtown Convention Center",
      "startTime": "2025-03-15T09:00:00Z",
      "endTime": "2025-03-15T18:00:00Z",
      "capacity": 500,
      "availableCapacity": 450,
      "price": 99.99,
      "category": "CONFERENCE",
      "tags": ["technology", "networking", "innovation"],
      "imageUrl": "https://example.com/event-image.jpg",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-05T10:30:00Z",
      "bookingsCount": 50
    },
    "userBookingStatus": {
      "hasBooked": false,
      "bookingId": null,
      "waitlistPosition": null
    }
  }
}
```

### Create Event (Admin Only)

```http
POST /api/events
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "New Workshop",
  "description": "Learn advanced techniques",
  "venue": "Training Room B",
  "startTime": "2025-04-20T14:00:00Z",
  "endTime": "2025-04-20T17:00:00Z",
  "capacity": 30,
  "price": 75.00,
  "category": "WORKSHOP",
  "tags": ["skills", "hands-on"],
  "imageUrl": "https://example.com/workshop.jpg"
}
```

### Update Event (Admin Only)

```http
PUT /api/events/{eventId}
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Updated Event Name",
  "capacity": 35,
  "price": 85.00
}
```

### Delete Event (Admin Only)

```http
DELETE /api/events/{eventId}
Authorization: Bearer <admin-token>
```

## Booking Management

### Create Booking

```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventId": "clxyz789...",
  "quantity": 2,
  "idempotencyKey": "user123-event789-20250315"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Booking confirmed! 🎉",
  "data": {
    "booking": {
      "id": "clbook456...",
      "quantity": 2,
      "totalPrice": 199.98,
      "status": "CONFIRMED",
      "createdAt": "2025-01-15T10:30:00Z",
      "event": {
        "id": "clxyz789...",
        "name": "Tech Conference 2025",
        "venue": "Convention Center",
        "startTime": "2025-03-15T09:00:00Z"
      }
    },
    "ticket": {
      "ticketNumber": "EVT-CLBOOK45",
      "downloadUrl": "/api/tickets/clbook456.../download",
      "qrCodeUrl": "/api/tickets/clbook456.../qr"
    }
  },
  "toast": {
    "type": "success",
    "title": "Booking Confirmed! 🎉",
    "message": "Your booking for Tech Conference 2025 has been confirmed!",
    "actions": [
      {
        "label": "Download Ticket",
        "url": "/api/tickets/clbook456.../download",
        "style": "primary"
      },
      {
        "label": "View QR Code",
        "url": "/api/tickets/clbook456.../qr",
        "style": "secondary"
      }
    ]
  }
}
```

### Get User Bookings

```http
GET /api/bookings/user/{userId}
Authorization: Bearer <token>
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "bookings": [
      {
        "id": "clbook456...",
        "quantity": 2,
        "totalPrice": 199.98,
        "status": "CONFIRMED",
        "createdAt": "2025-01-15T10:30:00Z",
        "event": {
          "id": "clxyz789...",
          "name": "Tech Conference 2025",
          "venue": "Convention Center",
          "startTime": "2025-03-15T09:00:00Z",
          "price": 99.99
        },
        "ticket": {
          "ticketNumber": "EVT-CLBOOK45",
          "downloadUrl": "/api/tickets/clbook456.../download",
          "qrCodeUrl": "/api/tickets/clbook456.../qr"
        }
      }
    ]
  }
}
```

### Cancel Booking

```http
DELETE /api/bookings/{bookingId}
Authorization: Bearer <token>
```

### Get All Bookings (Admin Only)

```http
GET /api/bookings?page=1&limit=20&status=CONFIRMED
Authorization: Bearer <admin-token>
```

## Waitlist Management

### Join Event Waitlist

```http
POST /api/events/{eventId}/waitlist
Authorization: Bearer <token>
```

**Response:**

```json
{
  "status": "success",
  "message": "Added to waitlist",
  "data": {
    "waitlistEntry": {
      "id": "clwait123...",
      "position": 5,
      "status": "WAITING",
      "joinedAt": "2025-01-15T11:00:00Z",
      "estimatedWaitTime": "2-3 days"
    }
  }
}
```

### Leave Waitlist

```http
DELETE /api/events/{eventId}/waitlist
Authorization: Bearer <token>
```

### Get User Waitlist

```http
GET /api/users/{userId}/waitlist
Authorization: Bearer <token>
```

### Get Event Waitlist (Admin Only)

```http
GET /api/events/{eventId}/waitlist
Authorization: Bearer <admin-token>
```

## Ticket Management

### Download Ticket PDF

```http
GET /api/tickets/{bookingId}/download
Authorization: Bearer <token>
```

**Response:** PDF file download

### Get QR Code

```http
GET /api/tickets/{bookingId}/qr
Authorization: Bearer <token>
```

**Response:** PNG image of QR code

### Get Ticket Details

```http
GET /api/tickets/{bookingId}/details
Authorization: Bearer <token>
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "ticket": {
      "ticketNumber": "EVT-CLBOOK45",
      "bookingId": "clbook456...",
      "eventName": "Tech Conference 2025",
      "venue": "Convention Center",
      "eventDate": "2025-03-15T09:00:00Z",
      "quantity": 2,
      "holderName": "John Doe",
      "qrCode": "data:image/png;base64,iVBORw0KGgoA..."
    }
  }
}
```

### Verify Ticket (Admin/Staff)

```http
GET /api/tickets/verify/{bookingId}
Authorization: Bearer <token>
```

### Check-in Ticket (Admin/Staff)

```http
POST /api/tickets/checkin/{bookingId}
Authorization: Bearer <token>
```

## Admin Analytics

### Get Overview Statistics

```http
GET /api/admin/data/overview
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "totalEvents": 25,
    "totalBookings": 1250,
    "totalUsers": 450,
    "activeEvents": 5,
    "upcomingEvents": 12,
    "totalRevenue": 125000.5,
    "recentBookings": 45,
    "totalWaitlists": 89
  }
}
```

### Get Event Analytics

```http
GET /api/admin/data/events?timeframe=30d&limit=50
Authorization: Bearer <admin-token>
```

### Get Booking Analytics

```http
GET /api/admin/data/bookings?timeframe=7d
Authorization: Bearer <admin-token>
```

### Get User Analytics

```http
GET /api/admin/data/users?timeframe=90d
Authorization: Bearer <admin-token>
```

### Get Revenue Analytics

```http
GET /api/admin/data/revenue?timeframe=30d
Authorization: Bearer <admin-token>
```

## Notification Management

### Subscribe to Push Notifications

```http
POST /api/notifications/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BKg...",
    "auth": "abc123..."
  }
}
```

### Get VAPID Public Key

```http
GET /api/notifications/vapid-key
```

### Get User Notifications

```http
GET /api/notifications/user/{userId}
Authorization: Bearer <token>
```

### Mark Notification as Read

```http
POST /api/notifications/mark-read/{notificationId}
Authorization: Bearer <token>
```

## Search & Discovery

### Search Events

```http
GET /api/search?q=conference&category=CONFERENCE&venue=downtown&date_from=2025-03-01&date_to=2025-03-31
```

### Get Search Suggestions

```http
GET /api/search/suggestions?q=tech
```

### Get Popular Searches

```http
GET /api/search/popular
```

### Get Upcoming Events

```http
GET /api/search/upcoming?limit=5
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field error"
  }
}
```

**Common HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate booking, no capacity)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Booking endpoints**: 10 requests per minute per user
- **General endpoints**: 100 requests per minute per IP
- **Search endpoints**: 50 requests per minute per IP

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Webhook Events

For real-time integrations, Evently supports webhooks for key events:

- `booking.created` - New booking confirmed
- `booking.cancelled` - Booking cancelled
- `waitlist.promoted` - User promoted from waitlist
- `event.updated` - Event details changed
- `ticket.downloaded` - Ticket PDF downloaded

## SDK & Libraries

### JavaScript/TypeScript

```bash
npm install @evently/api-client
```

```javascript
import { EventlyClient } from "@evently/api-client";

const client = new EventlyClient({
  baseUrl: "https://api.evently.com",
  apiKey: "your-api-key",
});

// Get events
const events = await client.events.list();

// Create booking
const booking = await client.bookings.create({
  eventId: "clxyz789...",
  quantity: 2,
});
```

## Testing

### Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "status": "success",
  "message": "Evently API is running!",
  "timestamp": "2025-01-15T12:00:00Z",
  "version": "1.0.0"
}
```

### Test Endpoint

```http
GET /api/test
```

## Changelog

### v1.0.0 (Current)

- Initial API release
- Authentication & user management
- Event CRUD operations
- Booking system with concurrency handling
- Waitlist management
- Ticket generation and verification
- Admin analytics
- Push notifications
- Search functionality

---

**Need Help?**

- API Documentation: `/api-docs` (Swagger UI)
- Support: support@evently.com
- GitHub Issues: [Repository Issues](https://github.com/SahilSoni27/evently/issues)
