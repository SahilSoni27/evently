import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const bookingSuccessRate = new Rate('booking_success_rate');
const bookingDuration = new Trend('booking_duration', true);
const authFailures = new Counter('auth_failures');
const serverErrors = new Counter('server_errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://evently-p02p.onrender.com';
const TEST_EVENT_ID = __ENV.EVENT_ID || 'cmfig27wb0003nveqxb9e6xza'; // Tech Conference 2025

// Test data
const TEST_USERS = [
  { email: 'user@evently.com', password: 'password123' },
  { email: 'jane@evently.com', password: 'password123' },
  { email: 'admin@evently.com', password: 'password123' }
];

// Test scenarios
export const options = {
  scenarios: {
    // Warm-up phase
    warmup: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      tags: { phase: 'warmup' },
    },
    
    // Load test - Normal traffic
    load_test: {
      executor: 'constant-vus',
      vus: 25,
      duration: '2m',
      startTime: '30s',
      tags: { phase: 'load' },
    },
    
    // Stress test - Peak traffic (Black Friday scenario)
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 25,
      stages: [
        { duration: '1m', target: 100 },   // Ramp up to 100 users
        { duration: '2m', target: 100 },   // Maintain 100 users
        { duration: '1m', target: 200 },   // Spike to 200 users
        { duration: '2m', target: 200 },   // Maintain spike
        { duration: '1m', target: 0 },     // Ramp down
      ],
      startTime: '2m30s',
      tags: { phase: 'stress' },
    },
    
    // Spike test - Sudden traffic burst (Taylor Swift scenario)
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },  // Sudden spike
        { duration: '30s', target: 500 },  // Maintain spike
        { duration: '10s', target: 0 },    // Quick ramp down
      ],
      startTime: '6m30s',
      tags: { phase: 'spike' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% under 2s, 99% under 5s
    http_req_failed: ['rate<0.1'],                    // Error rate under 10%
    booking_success_rate: ['rate>0.9'],              // 90%+ booking success
    booking_duration: ['p(95)<3000'],                // 95% of bookings under 3s
  },
};

// Setup function - runs once
export function setup() {
  console.log('🚀 Starting Evently Performance Tests');
  console.log(`📊 Base URL: ${BASE_URL}`);
  console.log(`🎫 Test Event ID: ${TEST_EVENT_ID}`);
  
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'Health check passed': (r) => r.status === 200,
  });
  
  return { baseUrl: BASE_URL, eventId: TEST_EVENT_ID };
}

// Main test function
export default function (data) {
  const { baseUrl, eventId } = data;
  
  // Select random user for this iteration
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
  
  // Test phases based on scenario tag
  const phase = __ENV.PHASE || (__VU % 3 === 0 ? 'booking' : (__VU % 3 === 1 ? 'browsing' : 'waitlist'));
  
  switch (phase) {
    case 'booking':
      testBookingFlow(baseUrl, eventId, user);
      break;
    case 'browsing':
      testBrowsingFlow(baseUrl);
      break;
    case 'waitlist':
      testWaitlistFlow(baseUrl, eventId, user);
      break;
    default:
      testBookingFlow(baseUrl, eventId, user);
  }
  
  sleep(Math.random() * 3 + 1); // Random sleep 1-4 seconds
}

// Booking flow test
function testBookingFlow(baseUrl, eventId, user) {
  let token;
  
  // 1. Login
  const loginStart = new Date();
  const loginRes = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'login' },
  });
  
  const loginSuccess = check(loginRes, {
    'Login successful': (r) => r.status === 200,
    'Login response time OK': (r) => r.timings.duration < 2000,
  });
  
  if (!loginSuccess) {
    authFailures.add(1);
    return;
  }
  
  const loginData = JSON.parse(loginRes.body);
  token = loginData.data?.token;
  
  if (!token) {
    authFailures.add(1);
    return;
  }
  
  // 2. Get event details
  const eventRes = http.get(`${baseUrl}/api/events/${eventId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { endpoint: 'event_details' },
  });
  
  check(eventRes, {
    'Event details loaded': (r) => r.status === 200,
    'Event response time OK': (r) => r.timings.duration < 1000,
  });
  
  // 3. Attempt booking
  const bookingStart = new Date();
  const bookingRes = http.post(`${baseUrl}/api/bookings`, JSON.stringify({
    eventId: eventId,
    quantity: Math.floor(Math.random() * 3) + 1, // 1-3 tickets
    idempotencyKey: `k6-test-${__VU}-${__ITER}-${Date.now()}`
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    tags: { endpoint: 'booking' },
  });
  
  const bookingDurationMs = new Date() - bookingStart;
  bookingDuration.add(bookingDurationMs);
  
  const bookingSuccess = check(bookingRes, {
    'Booking attempted': (r) => r.status === 200 || r.status === 201 || r.status === 400,
    'No server errors': (r) => r.status < 500,
    'Booking response time OK': (r) => r.timings.duration < 5000,
  });
  
  if (bookingRes.status >= 500) {
    serverErrors.add(1);
  }
  
  // Success if booking created or already exists
  const isBookingSuccess = bookingRes.status === 200 || bookingRes.status === 201;
  bookingSuccessRate.add(isBookingSuccess);
  
  // 4. Check user bookings
  if (isBookingSuccess) {
    const userBookingsRes = http.get(`${baseUrl}/api/bookings/my`, {
      headers: { 'Authorization': `Bearer ${token}` },
      tags: { endpoint: 'user_bookings' },
    });
    
    check(userBookingsRes, {
      'User bookings loaded': (r) => r.status === 200,
    });
  }
}

// Browsing flow test
function testBrowsingFlow(baseUrl) {
  // 1. Home page / events list
  const eventsRes = http.get(`${baseUrl}/api/events`, {
    tags: { endpoint: 'events_list' },
  });
  
  check(eventsRes, {
    'Events list loaded': (r) => r.status === 200,
    'Events response time OK': (r) => r.timings.duration < 1500,
  });
  
  // 2. Health check
  const healthRes = http.get(`${baseUrl}/api/health`, {
    tags: { endpoint: 'health' },
  });
  
  check(healthRes, {
    'Health check OK': (r) => r.status === 200,
    'Services healthy': (r) => {
      const body = JSON.parse(r.body);
      return body.status === 'success' || body.status === 'degraded';
    },
  });
  
  // 3. Analytics endpoint
  const analyticsRes = http.get(`${baseUrl}/api/admin/data/overview`, {
    tags: { endpoint: 'analytics' },
  });
  
  check(analyticsRes, {
    'Analytics accessible': (r) => r.status === 200 || r.status === 401, // 401 is OK (no auth)
  });
}

// Waitlist flow test
function testWaitlistFlow(baseUrl, eventId, user) {
  // Login first
  const loginRes = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'login' },
  });
  
  if (loginRes.status !== 200) {
    authFailures.add(1);
    return;
  }
  
  const token = JSON.parse(loginRes.body).data?.token;
  if (!token) return;
  
  // Try to join waitlist
  const waitlistRes = http.post(`${baseUrl}/api/events/${eventId}/waitlist`, JSON.stringify({}), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    tags: { endpoint: 'waitlist_join' },
  });
  
  check(waitlistRes, {
    'Waitlist request processed': (r) => r.status === 200 || r.status === 201 || r.status === 400,
    'No server errors on waitlist': (r) => r.status < 500,
  });
  
  // Check waitlist status
  const waitlistStatusRes = http.get(`${baseUrl}/api/events/${eventId}/waitlist/my-position`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { endpoint: 'waitlist_status' },
  });
  
  check(waitlistStatusRes, {
    'Waitlist status accessible': (r) => r.status === 200 || r.status === 404,
  });
}

// Teardown function
export function teardown(data) {
  console.log('🏁 Performance tests completed');
  console.log('📊 Check the results above for detailed metrics');
}
