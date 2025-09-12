#!/usr/bin/env node

/**
 * Test seat-level booking capacity updates with admin access
 */

const axios = require("axios");

const API_BASE_URL = "http://localhost:4000/api";

async function testSeatBookingWithAdmin() {
  console.log(
    "🪑 Testing seat-level booking capacity updates (admin access)...\n"
  );

  try {
    // Login as admin to ensure access
    const adminResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: "admin@evently.com",
      password: "password123",
    });
    const adminToken = adminResponse.data.data.token;
    console.log("✅ Admin logged in");

    // Get events as admin
    const eventsResponse = await axios.get(`${API_BASE_URL}/events`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const events = eventsResponse.data.data.events;

    console.log(`✅ Found ${events.length} total events`);
    events.forEach((event) => {
      console.log(
        `   - ${event.name}: seatLevelBooking=${event.seatLevelBooking}, capacity=${event.availableCapacity}/${event.capacity}`
      );
    });

    // Find seat-level booking events
    const seatEvents = events.filter(
      (e) => e.seatLevelBooking && e.availableCapacity > 0
    );
    console.log(
      `✅ Found ${seatEvents.length} seat-level booking events with availability`
    );

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
      `${API_BASE_URL}/seats/event/${seatEvent.id}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    console.log("✅ Seats API response:", seatsResponse.data.status);

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
        idempotencyKey: `admin-seat-test-${Date.now()}`,
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    const jobId = seatBookingResponse.data.data.jobId;
    console.log("✅ Seat booking queued with job ID:", jobId);

    // Wait for processing
    console.log("⏳ Waiting for booking to process...");
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // Check booking status multiple times if needed
    let attempts = 0;
    let bookingResult = null;

    while (attempts < 5) {
      try {
        const statusResponse = await axios.get(
          `${API_BASE_URL}/seats/booking-status/${jobId}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        bookingResult = statusResponse.data.data;
        console.log(
          `📊 Booking result (attempt ${attempts + 1}):`,
          bookingResult
        );

        if (
          bookingResult.success ||
          bookingResult.message !== "Booking is being processed..."
        ) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        console.log(
          `❌ Status check failed (attempt ${attempts + 1}):`,
          error.response?.data?.message || error.message
        );
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (bookingResult && bookingResult.success) {
      console.log("✅ Seat booking successful!");

      // Check event capacity after booking
      const updatedEventResponse = await axios.get(
        `${API_BASE_URL}/events/${seatEvent.id}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
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
        console.log("🔧 This was the main issue we needed to fix!");
      }

      // Also check that the seat is now marked as booked
      const updatedSeatsResponse = await axios.get(
        `${API_BASE_URL}/seats/event/${seatEvent.id}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      const updatedSeats = updatedSeatsResponse.data.data.sections.flatMap(
        (section) => section.seats
      );

      const bookedSeat = updatedSeats.find((s) => s.id === targetSeat.id);
      console.log(
        `\n📍 Seat ${targetSeat.id} status: ${
          bookedSeat?.isBooked ? "Booked ✅" : "Available ❌"
        }`
      );
    } else {
      console.log("❌ Seat booking failed or timed out");
      if (bookingResult) {
        console.log("❌ Error:", bookingResult.message);
      }
    }
  } catch (error) {
    console.error(
      "❌ Test failed:",
      error.response?.data?.message || error.message
    );
    if (error.response?.data) {
      console.error("Full error response:", error.response.data);
    }
  }
}

testSeatBookingWithAdmin();
