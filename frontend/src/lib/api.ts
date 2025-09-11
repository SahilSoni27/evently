import { CreateEventData, UpdateEventData } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private getAuthHeader(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Handle different HTTP status codes
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        
        // Try to get error message from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use the status message
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async login(credentials: { email: string; password: string }) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: { name: string; email: string; password: string }) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Events
  async getEvents(page = 1, limit = 10, search?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    return this.request(`/api/events?${params}`);
  }

  async getEvent(id: string) {
    return this.request(`/api/events/${id}`);
  }

  async createEvent(eventData: CreateEventData) {
    return this.request('/api/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(id: string, eventData: UpdateEventData) {
    return this.request(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(id: string) {
    return this.request(`/api/events/${id}`, {
      method: 'DELETE',
    });
  }

  // Bookings
  async createBooking(bookingData: {
    eventId: string;
    quantity: number;
    idempotencyKey?: string;
  }) {
    return this.request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getUserBookings(userId: string) {
    return this.request(`/api/bookings/user/${userId}`);
  }

  async cancelBooking(bookingId: string) {
    return this.request(`/api/bookings/${bookingId}`, {
      method: 'DELETE',
    });
  }

  async getAllBookings(page = 1, limit = 10, status?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    return this.request(`/api/bookings?${params}`);
  }

  // Payments
  async processPayment(paymentData: {
    bookingId: string;
    paymentMethod: string;
    cardDetails?: Record<string, unknown>;
  }) {
    return this.request('/api/payments/process', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async getPaymentStatus(bookingId: string) {
    return this.request(`/api/payments/booking/${bookingId}`);
  }

  async getUserPayments(userId: string) {
    return this.request(`/api/payments/user/${userId}`);
  }

  async processRefund(paymentId: string, reason: string) {
    return this.request(`/api/payments/refund/${paymentId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Admin Dashboard Data
  async getAnalyticsOverview() {
    return this.request('/api/admin/dashboard/overview');
  }

  async getEventAnalytics(timeframe = '30d', limit = 10) {
    const params = new URLSearchParams({
      timeframe,
      limit: limit.toString(),
    });
    return this.request(`/api/admin/dashboard/events?${params}`);
  }

  async getBookingAnalytics(timeframe = '30d') {
    const params = new URLSearchParams({ timeframe });
    return this.request(`/api/admin/dashboard/bookings?${params}`);
  }

  async getUserAnalytics(timeframe = '30d') {
    const params = new URLSearchParams({ timeframe });
    return this.request(`/api/admin/dashboard/users?${params}`);
  }

  async getRevenueAnalytics(timeframe = '30d') {
    const params = new URLSearchParams({ timeframe });
    return this.request(`/api/admin/dashboard/revenue?${params}`);
  }
}

export const apiClient = new ApiClient();
