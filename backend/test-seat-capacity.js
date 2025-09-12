#!/usr/bin/env node

/**
 * Test seat-level booking capacity updates
 */

const axios = require("axios");

const API_BASE_URL = "http://localhost:4000/api";

async function testSeatBooking() {
  console.log("🪑 Testing seat-level booking capacity updates...\n");

  try {
    // Login as regular user
    const userResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: "user@evently.com",
      password: "password123",
    });
    const userToken = userResponse.data.data.token;
    console.log("✅ User logged in");

    // Get events
    const eventsResponse = await axios.get(`${API_BASE_URL}/events`);
    const events = eventsResponse.data.data.events;

    // Find seat-level booking events
    const seatEvents = events.filter(
      (e) => e.seatLevelBooking && e.availableCapacity > 0
    );
    console.log(`✅ Found ${seatEvents.length} seat-level booking events`);

    if (seatEvents.length === 0) {
      console.log("❌ No seat-level booking events found");
      return;
    }

    const seatEvent = seatEvents[0];
    console.log(`\n📍 Testing with: ${seatEvent.name}`);
    console.log(
      `📊 Initial capacity: ${seatEvent.availableCapacity}/${seatEvent.capacity}`
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

    console.log(`📊 Available individual seats: ${availableSeats.length}`);

    if (availableSeats.length === 0) {
      console.log("❌ No available seats found");
      return;
    }

    // Book a seat
    const targetSeat = availableSeats[0];
    console.log(
      `\n🎯 Booking seat: ${targetSeat.id} (Row ${targetSeat.row}, Seat ${targetSeat.number})`
    );

    const seatBookingResponse = await axios.post(
      `${API_BASE_URL}/seats/book`,
      {
        eventId: seatEvent.id,
        seatIds: [targetSeat.id],
        idempotencyKey: `seat-capacity-test-${Date.now()}`,
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    const jobId = seatBookingResponse.data.data.jobId;
    console.log("✅ Seat booking queued with job ID:", jobId);

    // Wait for processing
    console.log("⏳ Waiting for booking to process...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check booking status
    const statusResponse = await axios.get(
      `${API_BASE_URL}/seats/booking-status/${jobId}`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    const bookingResult = statusResponse.data.data;
    console.log("📊 Booking result:", bookingResult);

    if (bookingResult.success) {
      console.log("✅ Seat booking successful!");

      // Check event capacity after booking
      const updatedEventResponse = await axios.get(
        `${API_BASE_URL}/events/${seatEvent.id}`
      );
      const updatedEvent = updatedEventResponse.data.data.event;

      console.log(`\n📊 Event capacity comparison:`);
      console.log(
        `   Before: ${seatEvent.availableCapacity}/${seatEvent.capacity}`
      );
      console.log(
        `   After:  ${updatedEvent.availableCapacity}/${updatedEvent.capacity}`
      );

      const capacityDecreased =
        updatedEvent.availableCapacity < seatEvent.availableCapacity;
      const decreaseAmount =
        seatEvent.availableCapacity - updatedEvent.availableCapacity;

      console.log(`   Decreased by: ${decreaseAmount}`);
      console.log(
        `   ✅ Capacity correctly decreased: ${
          capacityDecreased ? "Yes" : "No"
        }`
      );

      if (capacityDecreased && decreaseAmount === 1) {
        console.log(
          "🎉 SUCCESS: Seat booking properly updates event capacity!"
        );
      } else {
        console.log(
          "❌ ISSUE: Seat booking did not properly update event capacity"
        );
      }

      // Also check that the seat is now marked as booked
      const updatedSeatsResponse = await axios.get(
        `${API_BASE_URL}/seats/${seatEvent.id}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      const updatedSeats = updatedSeatsResponse.data.data.sections.flatMap(
        (section) => section.seats
      );

      const bookedSeat = updatedSeats.find((s) => s.id === targetSeat.id);
      console.log(
        `\n📍 Seat ${targetSeat.id} status: ${
          bookedSeat?.isBooked ? "Booked" : "Available"
        }`
      );
    } else {
      console.log("❌ Seat booking failed:", bookingResult.message);
    }
  } catch (error) {
    console.error(
      "❌ Test failed:",
      error.response?.data?.message || error.message
    );
    console.error("Full error:", error.response?.data || error);
  }
}

testSeatBooking();
