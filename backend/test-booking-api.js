#!/usr/bin/env node

const axios = require("axios");

const API_BASE_URL = "http://localhost:4000/api";

async function testBookingAPI() {
  try {
    console.log("🧪 Testing Booking API...\n");

    // Step 1: Login to get a valid token
    console.log("1. Logging in as regular user...");
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: "user@evently.com",
      password: "password123",
    });

    const token = loginResponse.data.data.token;
    console.log("✅ Login successful, got token");

    // Step 2: Get events to find a valid event ID
    console.log("\n2. Getting available events...");
    const eventsResponse = await axios.get(`${API_BASE_URL}/events`);
    const events = eventsResponse.data.data.events;

    const regularEvent = events.find((event) => !event.seatLevelBooking);
    if (!regularEvent) {
      throw new Error("No regular booking events found");
    }

    console.log(
      `✅ Found event: "${regularEvent.name}" (ID: ${regularEvent.id})`
    );
    console.log(`   Available capacity: ${regularEvent.availableCapacity}`);

    // Step 3: Create a booking
    console.log("\n3. Creating a booking...");
    const bookingResponse = await axios.post(
      `${API_BASE_URL}/bookings`,
      {
        eventId: regularEvent.id,
        quantity: 1,
        idempotencyKey: `test-booking-${Date.now()}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Booking created successfully!");
    console.log("Response:", JSON.stringify(bookingResponse.data, null, 2));
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
    if (error.response?.data) {
      console.error(
        "Full error details:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

testBookingAPI();
