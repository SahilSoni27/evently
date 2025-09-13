import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Counter, Trend } from "k6/metrics";

// Event management performance metrics
const eventCreationSuccess = new Rate("event_creation_success");
const eventUpdateSuccess = new Rate("event_update_success");
const eventQueryTime = new Trend("event_query_duration");
const eventOperations = new Counter("total_event_operations");

const BASE_URL = __ENV.BASE_URL || "https://evently-p02p.onrender.com";

export const options = {
  scenarios: {
    event_management_load: {
      executor: "ramping-vus",
      startVUs: 2,
      stages: [
        { duration: "30s", target: 5 }, // Ramp up
        { duration: "1m", target: 5 }, // Sustained load
        { duration: "30s", target: 8 }, // Peak organizer activity
        { duration: "1m", target: 8 }, // Peak sustained
        { duration: "30s", target: 0 }, // Cool down
      ],
      tags: { scenario: "event_management" },
    },
  },
  thresholds: {
    event_creation_success: ["rate>0.95"], // 95% event creation success
    event_query_time: ["p(90)<1000"], // Queries under 1s
    http_req_duration: ["p(95)<2000"], // 95% under 2s
  },
};

// Admin/Organizer credentials for event management
const ORGANIZERS = [
  { email: "admin@evently.com", password: "admin123" },
  { email: "organizer1@evently.com", password: "password123" },
  { email: "organizer2@evently.com", password: "password123" },
];

export function setup() {
  console.log("🎪 Testing Event Management System");
  console.log("📊 Simulating multiple organizers managing events");
  return { baseUrl: BASE_URL };
}

export default function (data) {
  const { baseUrl } = data;
  const organizer = ORGANIZERS[__VU % ORGANIZERS.length];

  // Login as organizer
  const token = authenticateOrganizer(baseUrl, organizer);
  if (!token) return;

  // Perform various event management operations
  eventManagementFlow(baseUrl, token);
}

function authenticateOrganizer(baseUrl, organizer) {
  const loginRes = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({
      email: organizer.email,
      password: organizer.password,
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { action: "organizer_login" },
    }
  );

  if (loginRes.status !== 200) return null;

  const response = JSON.parse(loginRes.body);
  return response.data?.token;
}

function eventManagementFlow(baseUrl, token) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 1. Check existing events (dashboard load)
  const startQuery = new Date();
  const eventsRes = http.get(`${baseUrl}/api/events?page=1&limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { action: "dashboard_load" },
  });

  if (eventsRes.status === 200) {
    eventQueryTime.add(new Date() - startQuery);
  }

  check(eventsRes, {
    "Dashboard loads successfully": (r) => r.status === 200,
  });

  // 2. Create new event (simulate organizer creating events)
  if (Math.random() > 0.7) {
    // 30% chance to create event
    const eventData = generateEventData();
    const createRes = http.post(
      `${baseUrl}/api/events`,
      JSON.stringify(eventData),
      {
        headers,
        tags: { action: "create_event" },
      }
    );

    const creationSuccess = createRes.status === 201;
    eventCreationSuccess.add(creationSuccess);
    eventOperations.add(1);

    check(createRes, {
      "Event creation succeeds": (r) => r.status === 201,
      "Event has valid ID": (r) => {
        if (r.status === 201) {
          const body = JSON.parse(r.body);
          return body.data && body.data.id;
        }
        return false;
      },
    });

    // If event created successfully, try to update it
    if (creationSuccess) {
      const eventId = JSON.parse(createRes.body).data.id;
      sleep(0.5); // Brief pause

      const updateData = {
        title: eventData.title + " - Updated",
        description: eventData.description + " Updated information.",
      };

      const updateRes = http.put(
        `${baseUrl}/api/events/${eventId}`,
        JSON.stringify(updateData),
        {
          headers,
          tags: { action: "update_event" },
        }
      );

      const updateSuccess = updateRes.status === 200;
      eventUpdateSuccess.add(updateSuccess);
      eventOperations.add(1);

      check(updateRes, {
        "Event update succeeds": (r) => r.status === 200,
      });
    }
  }

  // 3. Check event analytics/stats (common organizer action)
  if (Math.random() > 0.5) {
    // 50% chance
    const analyticsRes = http.get(`${baseUrl}/api/events?analytics=true`, {
      headers: { Authorization: `Bearer ${token}` },
      tags: { action: "check_analytics" },
    });

    check(analyticsRes, {
      "Analytics data accessible": (r) => r.status === 200,
    });
  }

  // 4. Search/filter events (organizer managing multiple events)
  if (Math.random() > 0.6) {
    // 40% chance
    const searchRes = http.get(
      `${baseUrl}/api/events?search=test&category=conference`,
      {
        headers: { Authorization: `Bearer ${token}` },
        tags: { action: "search_events" },
      }
    );

    check(searchRes, {
      "Event search works": (r) => r.status === 200,
    });
  }

  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s between operations
}

function generateEventData() {
  const eventTypes = [
    "Conference",
    "Concert",
    "Workshop",
    "Seminar",
    "Festival",
  ];
  const categories = [
    "technology",
    "music",
    "business",
    "education",
    "entertainment",
  ];

  const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const randomCategory =
    categories[Math.floor(Math.random() * categories.length)];
  const randomId = Math.floor(Math.random() * 10000);

  const futureDate = new Date();
  futureDate.setDate(
    futureDate.getDate() + Math.floor(Math.random() * 90) + 30
  ); // 30-120 days from now

  return {
    title: `${randomType} Event ${randomId}`,
    description: `This is a test ${randomType.toLowerCase()} for performance testing. Event ID: ${randomId}`,
    startDate: futureDate.toISOString(),
    endDate: new Date(futureDate.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours later
    location: `Test Venue ${randomId}`,
    capacity: Math.floor(Math.random() * 500) + 100, // 100-600 capacity
    price: Math.floor(Math.random() * 200) + 50, // $50-250
    category: randomCategory,
    imageUrl: `https://picsum.photos/800/600?random=${randomId}`,
    tags: [`test-${randomId}`, randomCategory, "performance-test"],
  };
}

export function teardown(data) {
  console.log("🎪 Event management testing completed");
  console.log("📊 Check metrics for organizer workflow performance");
}
