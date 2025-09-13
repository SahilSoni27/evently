export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export type EventCategory = 
  | 'CONFERENCE'
  | 'WORKSHOP' 
  | 'NETWORKING'
  | 'SOCIAL'
  | 'BUSINESS'
  | 'ENTERTAINMENT'
  | 'SPORTS'
  | 'EDUCATION'
  | 'CULTURAL'
  | 'OTHER';

export interface Event {
  id: string;
  name: string;
  description: string | null;
  venue: string;
  startTime: string;
  endTime: string | null;
  capacity: number;
  availableCapacity: number;
  price: string;
  category: EventCategory;
  tags: string[];
  imageUrl: string | null;
  seatLevelBooking?: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    bookings: number;
    waitlist?: number;
  };
  userStatus?: {
    hasBooking: boolean;
    bookingId?: string;
    waitlistPosition?: number;
    canJoinWaitlist?: boolean;
    canBook?: boolean;
  };
  availability?: {
    isFull: boolean;
    available: number;
    total: number;
    waitlistCount: number;
    bookingsCount: number;
  };
}

export interface CreateEventData {
  name: string;
  description?: string;
  venue: string;
  startTime: string;
  endTime?: string;
  capacity: number;
  price: string;
  category: EventCategory;
  tags?: string[];
  imageUrl?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id?: string;
}

export interface BookingData {
  eventId: string;
  quantity: number;
}

export interface AnalyticsData {
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  activeUsers: number;
  eventsByCategory: Array<{ category: string; count: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  topEvents: Array<{ id: string; name: string; bookings: number }>;
}

export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  quantity: number;
  totalPrice: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'PENDING';
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    name: string;
    venue: string;
    startTime: string;
    endTime: string | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface Payment {
  id: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  transactionId: string | null;
  processedAt: string | null;
  failureReason: string | null;
  booking: {
    id: string;
    quantity: number;
    totalPrice: string;
    status: string;
    event: {
      id: string;
      name: string;
      venue: string;
      startTime: string;
    };
  };
}
