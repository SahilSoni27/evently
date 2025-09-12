#!/usr/bin/env node

/**
 * Test script to verify concurrent booking behavior
 * This script simulates two users trying to book the same seat/event simultaneously
 */

const axios = require("axios");

const API_BASE_URL = "http://localhost:4000/api";

// Test users
const testUsers = [
  {
    email: "test-user1@example.com",
    password: "password123",
    name: "Test User 1",
  },
  {
    email: "test-user2@example.com",
    password: "password123",
    name: "Test User 2",
  },
];

let adminToken = "";
let userTokens = [];
let testEventId = "";

async function setup() {
  console.log("🔧 Setting up concurrent booking test...\n");

  // Login as admin
  try {
    const adminResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: "admin@evently.com",
      password: "password123",
    });
    adminToken = adminResponse.data.data.token;
    console.log("✅ Admin logged in");
  } catch (error) {
    console.error(
      "❌ Failed to login as admin:",
      error.response?.data?.message || error.message
    );
    process.exit(1);
  }

  // Create test users and get their tokens
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    try {
      // Try to register user (may fail if already exists)
      try {
        await axios.post(`${API_BASE_URL}/auth/register`, user);
        console.log(`✅ Created test user: ${user.email}`);
      } catch (regError) {
        // User might already exist, continue
        console.log(`ℹ️  User ${user.email} already exists, continuing...`);
      }

      // Login user
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: user.email,
        password: user.password,
      });
      userTokens.push(loginResponse.data.data.token);
      console.log(`✅ User ${user.email} logged in`);
    } catch (error) {
      console.error(
        `❌ Failed to setup user ${user.email}:`,
        error.response?.data?.message || error.message
      );
      process.exit(1);
    }
  }

  // Get an existing event for testing
  try {
    const eventsResponse = await axios.get(`${API_BASE_URL}/events`);
    const events = eventsResponse.data.data.events;
    if (events && events.length > 0) {
      // Find an event with available capacity
      const availableEvent = events.find((e) => e.availableCapacity > 0);
      if (availableEvent) {
        testEventId = availableEvent.id;
        console.log(
          `✅ Using test event: ${availableEvent.name} (${availableEvent.availableCapacity} spots available)`
        );
      } else {
        console.log("❌ No events with available capacity found");
        process.exit(1);
      }
    } else {
      console.log("❌ No events found");
      process.exit(1);
    }
  } catch (error) {
    console.error(
      "❌ Failed to get events:",
      error.response?.data?.message || error.message
    );
    process.exit(1);
  }

  console.log("\n🚀 Setup complete! Starting concurrent booking test...\n");
}

async function testConcurrentBooking() {
  console.log("📝 Testing concurrent booking scenario...");

  // Get current event capacity
  const eventResponse = await axios.get(
    `${API_BASE_URL}/events/${testEventId}`
  );
  const initialCapacity = eventResponse.data.data.event.availableCapacity;
  console.log(`📊 Initial available capacity: ${initialCapacity}`);

  // Both users try to book the same event at the same time
  const bookingPromises = userTokens.map((token, index) => {
    return axios
      .post(
        `${API_BASE_URL}/bookings`,
        {
          eventId: testEventId,
          quantity: 1,
          idempotencyKey: `concurrent-test-${Date.now()}-user-${index + 1}`,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then((response) => ({
        success: true,
        user: index + 1,
        booking: response.data.data.booking,
        message: response.data.message,
      }))
      .catch((error) => ({
        success: false,
        user: index + 1,
        error: error.response?.data?.message || error.message,
      }));
  });

  console.log("⏳ Both users attempting to book simultaneously...");

  // Execute both bookings concurrently
  const results = await Promise.all(bookingPromises);

  console.log("\n📊 Booking Results:");
  results.forEach((result) => {
    if (result.success) {
      console.log(
        `✅ User ${result.user}: Booking successful (ID: ${result.booking.id})`
      );
    } else {
      console.log(`❌ User ${result.user}: Booking failed - ${result.error}`);
    }
  });

  // Check final event capacity
  const finalEventResponse = await axios.get(
    `${API_BASE_URL}/events/${testEventId}`
  );
  const finalCapacity = finalEventResponse.data.data.event.availableCapacity;
  const capacityChange = initialCapacity - finalCapacity;

  console.log(`\n📊 Final available capacity: ${finalCapacity}`);
  console.log(`📊 Capacity decreased by: ${capacityChange}`);

  // Verify that only the expected number of bookings succeeded
  const successfulBookings = results.filter((r) => r.success).length;
  console.log(`📊 Successful bookings: ${successfulBookings}`);

  if (capacityChange === successfulBookings) {
    console.log(
      "✅ Capacity correctly decreased by number of successful bookings"
    );
  } else {
    console.log("❌ Capacity mismatch! This indicates a concurrency issue.");
  }

  return {
    results,
    initialCapacity,
    finalCapacity,
    capacityChange,
    successfulBookings,
  };
}

async function testSameSeatBooking() {
  console.log("\n🪑 Testing same seat booking scenario...");

  // Find an event with seat-level booking
  try {
    const eventsResponse = await axios.get(`${API_BASE_URL}/events`);
    const seatEvents = eventsResponse.data.data.events.filter(
      (e) => e.seatLevelBooking && e.availableCapacity > 0
    );

    if (seatEvents.length === 0) {
      console.log("ℹ️  No seat-level booking events found, skipping seat test");
      return null;
    }

    const seatEvent = seatEvents[0];
    console.log(`📍 Testing with seat event: ${seatEvent.name}`);

    // Get available seats
    const seatsResponse = await axios.get(
      `${API_BASE_URL}/seats/${seatEvent.id}`,
      {
        headers: { Authorization: `Bearer ${userTokens[0]}` },
      }
    );

    const availableSeats = seatsResponse.data.data.sections
      .flatMap((section) => section.seats)
      .filter((seat) => !seat.isBooked && !seat.isBlocked);

    if (availableSeats.length === 0) {
      console.log("ℹ️  No available seats found, skipping seat test");
      return null;
    }

    const targetSeat = availableSeats[0];
    console.log(`🎯 Both users will try to book seat: ${targetSeat.id}`);

    // Both users try to book the same seat
    const seatBookingPromises = userTokens.map((token, index) => {
      return axios
        .post(
          `${API_BASE_URL}/seats/book`,
          {
            eventId: seatEvent.id,
            seatIds: [targetSeat.id],
            idempotencyKey: `seat-test-${Date.now()}-user-${index + 1}`,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((response) => ({
          success: true,
          user: index + 1,
          booking: response.data.data,
          message: response.data.message,
        }))
        .catch((error) => ({
          success: false,
          user: index + 1,
          error: error.response?.data?.message || error.message,
        }));
    });

    console.log("⏳ Both users attempting to book the same seat...");

    const seatResults = await Promise.all(seatBookingPromises);

    console.log("\n📊 Seat Booking Results:");
    seatResults.forEach((result) => {
      if (result.success) {
        console.log(`✅ User ${result.user}: Seat booking successful`);
      } else {
        console.log(
          `❌ User ${result.user}: Seat booking failed - ${result.error}`
        );
      }
    });

    const successfulSeatBookings = seatResults.filter((r) => r.success).length;

    if (successfulSeatBookings === 1) {
      console.log(
        "✅ Exactly one user successfully booked the seat (correct behavior)"
      );
    } else if (successfulSeatBookings === 0) {
      console.log("⚠️  No users could book the seat");
    } else {
      console.log(
        "❌ Multiple users booked the same seat! This is a serious concurrency issue."
      );
    }

    return seatResults;
  } catch (error) {
    console.error(
      "❌ Error during seat booking test:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function runAllTests() {
  try {
    await setup();

    const basicResults = await testConcurrentBooking();
    const seatResults = await testSameSeatBooking();

    console.log("\n🎯 TEST SUMMARY:");
    console.log("================");
    console.log(
      `✅ Basic concurrent booking: ${basicResults.successfulBookings}/${userTokens.length} succeeded`
    );
    if (seatResults) {
      const successfulSeatBookings = seatResults.filter(
        (r) => r.success
      ).length;
      console.log(
        `✅ Same seat booking: ${successfulSeatBookings}/${userTokens.length} succeeded`
      );
    }
    console.log("");
    console.log("🔍 Observations:");
    console.log(
      "- Capacity should decrease by exactly the number of successful bookings"
    );
    console.log("- Only one user should be able to book the same seat");
    console.log("- Failed bookings should show appropriate error messages");
    console.log(
      "- Congratulations popup should only appear for successful bookings"
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, testConcurrentBooking, testSameSeatBooking };
