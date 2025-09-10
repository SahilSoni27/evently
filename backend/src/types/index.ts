import { User, Event, Booking } from '@prisma/client';

// Define enums manually (these should match Prisma schema)
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum EventCategory {
  CONFERENCE = 'CONFERENCE',
  WORKSHOP = 'WORKSHOP',
  NETWORKING = 'NETWORKING',
  SOCIAL = 'SOCIAL',
  BUSINESS = 'BUSINESS',
  ENTERTAINMENT = 'ENTERTAINMENT',
  SPORTS = 'SPORTS',
  EDUCATION = 'EDUCATION',
  CULTURAL = 'CULTURAL',
  OTHER = 'OTHER'
}

export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING'
}

// User related types
export interface UserWithBookings extends User {
  bookings: Booking[];
}

export interface CreateUserData {
  email: string;
  name?: string;
  password: string;
  role?: UserRole;
}

export interface LoginData {
  email: string;
  password: string;
}

// Event related types
export interface EventWithBookings extends Event {
  bookings: Booking[];
}

export interface CreateEventData {
  name: string;
  description?: string;
  venue: string;
  startTime: Date;
  endTime?: Date;
  capacity: number;
  price?: number;
  category?: EventCategory;
  tags?: string[];
  imageUrl?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {}

// Booking related types
export interface BookingWithUserAndEvent extends Booking {
  user: User;
  event: Event;
}

export interface CreateBookingData {
  userId: string;
  eventId: string;
  quantity?: number;
  idempotencyKey: string;
}

// API Response types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  status: 'success';
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

// Request types (for extending Express Request)
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Error types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Analytics types
export interface AnalyticsData {
  totalUsers: number;
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  popularEvents: Array<{
    id: string;
    name: string;
    bookingsCount: number;
  }>;
  recentBookings: Array<{
    id: string;
    eventName: string;
    userName: string;
    createdAt: Date;
  }>;
}
