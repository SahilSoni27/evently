import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for specific scenarios
const concurrentBookingSuccess = new Rate('concurrent_booking_success');
const waitlistConversion = new Rate('waitlist_conversion_rate');
const seatSelectionTime = new Trend('seat_selection_duration');

const BASE_URL = __ENV.BASE_URL || 'https://evently-p02p.onrender.com';

// Concurrent booking scenario (Taylor Swift concert rush)
export const options = {
  scenarios: {
    concurrent_booking_rush: {
      executor: 'shared-iterations',
      vus: 100,           // 100 users
      iterations: 500,    // 500 booking attempts
      maxDuration: '2m',
      tags: { scenario: 'concert_rush' },
    },
  },
  thresholds: {
    concurrent_booking_success: ['rate>0.5'], // At least 50% should succeed
    http_req_duration: ['p(95)<3000'],        // 95% under 3 seconds
    seatSelectionTime: ['p(90)<2000'],        // Seat selection under 2s
  },
};

// Test users for concurrent booking
const USERS = Array.from({ length: 20 }, (_, i) => ({
  email: `testuser${i + 1}@evently.com`,
  password: 'password123'
}));

export function setup() {
  console.log('🎵 Simulating Taylor Swift Concert Rush');
  console.log('🎯 100 users trying to book simultaneously');
  console.log('📊 Testing concurrent booking protection');
  return { baseUrl: BASE_URL };
}

export default function (data) {
  const { baseUrl } = data;
  const user = USERS[__VU % USERS.length];
  const eventId = 'cmfig27wb0003nveqxb9e6xza'; // Update with your event ID
  
  // Simulate the concert rush experience
  concurrentBookingRush(baseUrl, eventId, user);
}

function concurrentBookingRush(baseUrl, eventId, user) {
  // 1. User rushes to login
  const loginRes = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { action: 'rush_login' },
  });
  
  // Might fail due to concurrent load - that's realistic
  if (loginRes.status !== 200) {
    sleep(0.5); // Brief pause before retry
    return;
  }
  
  const token = JSON.parse(loginRes.body).data?.token;
  if (!token) return;
  
  // 2. Quick event check (users want to see available seats)
  const eventRes = http.get(`${baseUrl}/api/events/${eventId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { action: 'check_availability' },
  });
  
  check(eventRes, {
    'Can check event availability': (r) => r.status === 200,
  });
  
  // 3. Try to get seats (if seat selection is available)
  const seatStart = new Date();
  const seatsRes = http.get(`${baseUrl}/api/events/${eventId}/seats`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { action: 'seat_selection' },
  });
  
  if (seatsRes.status === 200) {
    seatSelectionTime.add(new Date() - seatStart);
  }
  
  // 4. Attempt the booking (the critical moment)
  const bookingRes = http.post(`${baseUrl}/api/bookings`, JSON.stringify({
    eventId: eventId,
    quantity: Math.random() > 0.7 ? 2 : 1, // 30% want 2 tickets, 70% want 1
    idempotencyKey: `rush-${__VU}-${__ITER}-${Date.now()}`
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    tags: { action: 'critical_booking' },
  });
  
  // Check booking result
  const bookingSuccess = check(bookingRes, {
    'Booking request processed': (r) => r.status >= 200 && r.status < 500,
    'No server crash': (r) => r.status !== 500,
    'Response time acceptable': (r) => r.timings.duration < 5000,
  });
  
  // Record if booking actually succeeded
  const actualSuccess = bookingRes.status === 200 || bookingRes.status === 201;
  concurrentBookingSuccess.add(actualSuccess);
  
  // 5. If booking failed, try waitlist
  if (!actualSuccess && bookingRes.status === 400) {
    const waitlistRes = http.post(`${baseUrl}/api/events/${eventId}/waitlist`, JSON.stringify({}), {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      tags: { action: 'join_waitlist' },
    });
    
    const waitlistSuccess = waitlistRes.status === 200 || waitlistRes.status === 201;
    waitlistConversion.add(waitlistSuccess);
    
    check(waitlistRes, {
      'Waitlist available as fallback': (r) => r.status < 500,
    });
  }
  
  // Brief pause to simulate user reading response
  sleep(0.1);
}

export function teardown(data) {
  console.log('🏁 Concert rush simulation completed');
  console.log('📊 Results will show how your system handles peak load');
}
