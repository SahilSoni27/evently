const axios = require("axios");

// Test configuration
const BASE_URL = "http://localhost:4000/api";
const TEST_USER = {
  email: "admin@example.com",
  password: "admin123",
  name: "Admin User",
};

let authToken = "";
let testEventId = "";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login() {
  try {
    console.log("🔐 Logging in...");
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    authToken = response.data.token;
    console.log("✅ Login successful");
    return true;
  } catch (error) {
    console.error("❌ Login failed:", error.response?.data || error.message);
    console.log("� Trying to create a test user account...");

    // First, let's check if we can use a different approach
    // For now, let's just try with any existing credentials
    const alternativeUsers = [
      { email: "user@example.com", password: "password123" },
      { email: "test@test.com", password: "test123" },
      { email: "admin@admin.com", password: "admin123" },
    ];

    for (const user of alternativeUsers) {
      try {
        console.log(`🔐 Trying credentials: ${user.email}...`);
        const response = await axios.post(`${BASE_URL}/auth/login`, user);
        authToken = response.data.token;
        console.log("✅ Login successful with alternative credentials");
        return true;
      } catch (altError) {
        // Continue to next user
      }
    }

    console.error(
      "❌ All login attempts failed. Please ensure you have a user account in the database."
    );
    return false;
  }
}

async function findSeatEvent() {
  try {
    console.log("🔍 Finding seat-level booking event...");
    const response = await axios.get(`${BASE_URL}/events`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const events = response.data.data.events || response.data.events || [];
    const seatEvent = events.find((event) => event.seatLevelBooking === true);

    if (seatEvent) {
      testEventId = seatEvent.id;
      console.log(
        `✅ Found seat event: ${seatEvent.name} (ID: ${testEventId})`
      );
      return true;
    } else {
      console.log("❌ No seat-level booking events found");
      return false;
    }
  } catch (error) {
    console.error(
      "❌ Failed to find events:",
      error.response?.data || error.message
    );
    return false;
  }
}

async function getAvailableSeats() {
  try {
    console.log("🪑 Getting available seats...");
    const response = await axios.get(`${BASE_URL}/seats/event/${testEventId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const sections =
      response.data.data?.sections || response.data.sections || [];
    const availableSeats = [];

    for (const section of sections) {
      for (const seat of section.seats || []) {
        if (!seat.isBooked && !seat.isBlocked) {
          availableSeats.push(seat.id);
          if (availableSeats.length === 2) break; // Get 2 seats max
        }
      }
      if (availableSeats.length === 2) break;
    }

    console.log(
      `✅ Found ${availableSeats.length} available seats:`,
      availableSeats
    );
    return availableSeats;
  } catch (error) {
    console.error(
      "❌ Failed to get seats:",
      error.response?.data || error.message
    );
    return [];
  }
}

async function testSeatBooking(seatIds) {
  try {
    console.log("🎫 Testing seat booking...");
    console.log("📝 Booking seats:", seatIds);

    const startTime = Date.now();
    const response = await axios.post(
      `${BASE_URL}/seats/book`,
      {
        eventId: testEventId,
        seatIds: seatIds,
        idempotencyKey: `test-${Date.now()}`,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 60000, // 60 second timeout
      }
    );

    const responseTime = Date.now() - startTime;
    console.log(`📈 Initial response time: ${responseTime}ms`);

    const jobId = response.data.data?.jobId || response.data.jobId;
    if (!jobId) {
      console.error("❌ No job ID returned");
      return false;
    }

    console.log(`✅ Booking job created: ${jobId}`);
    console.log("⏳ Polling for booking status...");

    // Poll for result
    for (let attempt = 1; attempt <= 30; attempt++) {
      await sleep(2000); // Wait 2 seconds between checks

      try {
        const statusResponse = await axios.get(
          `${BASE_URL}/seats/booking-status/${jobId}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 10000, // 10 second timeout for status checks
          }
        );

        const result = statusResponse.data.data;
        console.log(`📊 Attempt ${attempt}: ${result.message}`);

        if (result.success) {
          console.log(`✅ Booking successful! Booking ID: ${result.bookingId}`);
          console.log(`💰 Total price: $${result.totalPrice}`);
          console.log(`⏱️  Total time: ${Date.now() - startTime}ms`);
          return true;
        } else if (!result.message.includes("processing")) {
          console.error(`❌ Booking failed: ${result.message}`);
          return false;
        }
      } catch (statusError) {
        console.error(
          `⚠️  Status check ${attempt} failed:`,
          statusError.message
        );
      }
    }

    console.error("❌ Booking timed out after 30 attempts");
    return false;
  } catch (error) {
    console.error("❌ Seat booking failed:", error.message);
    if (error.code === "ECONNRESET") {
      console.error(
        "💥 ECONNRESET error detected - this is what we're trying to fix!"
      );
    }
    return false;
  }
}

async function runTest() {
  console.log("🧪 Starting seat booking connection test...\n");

  // Step 1: Login
  if (!(await login())) {
    console.log("❌ Test failed: Could not login");
    return;
  }

  // Step 2: Find seat event
  if (!(await findSeatEvent())) {
    console.log("❌ Test failed: No seat events found");
    return;
  }

  // Step 3: Get available seats
  const availableSeats = await getAvailableSeats();
  if (availableSeats.length === 0) {
    console.log("❌ Test failed: No available seats");
    return;
  }

  // Step 4: Test booking
  const success = await testSeatBooking(availableSeats.slice(0, 1)); // Book 1 seat

  if (success) {
    console.log(
      "\n🎉 Test PASSED: Seat booking completed without ECONNRESET errors!"
    );
  } else {
    console.log("\n💥 Test FAILED: Seat booking encountered issues");
  }
}

// Run the test
runTest().catch((error) => {
  console.error("💥 Test crashed:", error);
});
