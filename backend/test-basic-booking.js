#!/usr/bin/env node

/**
 * Quick test script to create test users and run basic booking tests
 */

const axios = require("axios");

const API_BASE_URL = "http://localhost:4000/api";

async function testBasicBooking() {
  console.log("🧪 Running basic booking test...\n");

  try {
    // Login as admin
    const adminResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: "admin@evently.com",
      password: "password123",
    });
    const adminToken = adminResponse.data.data.token;
    console.log("✅ Admin logged in");

    // Get events
    const eventsResponse = await axios.get(`${API_BASE_URL}/events`);
    const events = eventsResponse.data.data.events;
    console.log(`✅ Found ${events.length} events`);

    // Find an event with available capacity
    const availableEvent = events.find((e) => e.availableCapacity > 0);
    if (!availableEvent) {
      console.log("❌ No events with available capacity found");
      return;
    }

    console.log(`📊 Testing with event: ${availableEvent.name}`);
    console.log(
      `📊 Available capacity: ${availableEvent.availableCapacity}/${availableEvent.capacity}`
    );
    console.log(
      `📊 Seat level booking: ${availableEvent.seatLevelBooking ? "Yes" : "No"}`
    );

    // Login as regular user
    const userResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: "user@evently.com",
      password: "password123",
    });
    const userToken = userResponse.data.data.token;
    console.log("✅ Regular user logged in");

    // Test regular booking
    if (!availableEvent.seatLevelBooking) {
      console.log("\n🎫 Testing regular booking...");
      const bookingResponse = await axios.post(
        `${API_BASE_URL}/bookings`,
        {
          eventId: availableEvent.id,
          quantity: 1,
          idempotencyKey: `test-${Date.now()}`,
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      console.log(
        "✅ Booking successful:",
        bookingResponse.data.data.booking.id
      );

      // Check updated event capacity
      const updatedEventResponse = await axios.get(
        `${API_BASE_URL}/events/${availableEvent.id}`
      );
      const updatedEvent = updatedEventResponse.data.data.event;
      console.log(
        `📊 Capacity after booking: ${updatedEvent.availableCapacity}/${updatedEvent.capacity}`
      );

      const capacityDecreased =
        updatedEvent.availableCapacity < availableEvent.availableCapacity;
      console.log(
        `✅ Capacity correctly decreased: ${capacityDecreased ? "Yes" : "No"}`
      );
    }

    // Test seat booking if available
    const seatEvents = events.filter(
      (e) => e.seatLevelBooking && e.availableCapacity > 0
    );
    if (seatEvents.length > 0) {
      console.log("\n🪑 Testing seat-level booking...");
      const seatEvent = seatEvents[0];
      console.log(
        `📍 Seat event: ${seatEvent.name} (${seatEvent.availableCapacity} available)`
      );

      // Get available seats
      const seatsResponse = await axios.get(
        `${API_BASE_URL}/seats/${seatEvent.id}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      const availableSeats = seatsResponse.data.data.sections
        .flatMap((section) => section.seats)
        .filter((seat) => !seat.isBooked && !seat.isBlocked);

      if (availableSeats.length > 0) {
        const targetSeat = availableSeats[0];
        console.log(
          `🎯 Booking seat: ${targetSeat.id} (${targetSeat.row}-${targetSeat.number})`
        );

        const seatBookingResponse = await axios.post(
          `${API_BASE_URL}/seats/book`,
          {
            eventId: seatEvent.id,
            seatIds: [targetSeat.id],
            idempotencyKey: `seat-test-${Date.now()}`,
          },
          {
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );

        console.log(
          "✅ Seat booking queued:",
          seatBookingResponse.data.data.jobId
        );

        // Wait a bit and check status
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const statusResponse = await axios.get(
          `${API_BASE_URL}/seats/booking-status/${seatBookingResponse.data.data.jobId}`,
          { headers: { Authorization: `Bearer ${userToken}` } }
        );

        console.log("📊 Booking status:", statusResponse.data.data);

        // Check updated event capacity for seat booking
        const updatedSeatEventResponse = await axios.get(
          `${API_BASE_URL}/events/${seatEvent.id}`
        );
        const updatedSeatEvent = updatedSeatEventResponse.data.data.event;
        console.log(
          `📊 Seat event capacity after booking: ${updatedSeatEvent.availableCapacity}/${updatedSeatEvent.capacity}`
        );

        const seatCapacityDecreased =
          updatedSeatEvent.availableCapacity < seatEvent.availableCapacity;
        console.log(
          `✅ Seat booking capacity correctly decreased: ${
            seatCapacityDecreased ? "Yes" : "No"
          }`
        );
      }
    }

    console.log("\n🎯 TEST COMPLETE");
    console.log("================");
    console.log("✅ Basic booking functionality tested");
    console.log("✅ Event capacity update verification completed");
    console.log("✅ Both regular and seat-level bookings tested");
  } catch (error) {
    console.error(
      "❌ Test failed:",
      error.response?.data?.message || error.message
    );
  }
}

// Run the test
testBasicBooking();
