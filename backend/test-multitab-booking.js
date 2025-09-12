#!/usr/bin/env node

/**
 * Test concurrent booking behavior across different tabs
 * This simulates what happens when users open the same event in multiple tabs
 */

const axios = require("axios");

const API_BASE_URL = "http://localhost:4000/api";

async function testMultiTabBooking() {
  console.log("🔄 Testing Multi-Tab Booking Behavior...\n");

  try {
    // Login as two different users (simulating two different tabs/sessions)
    const users = [
      {
        email: "admin@evently.com",
        password: "password123",
        name: "User 1 (Tab 1)",
      },
      {
        email: "user@evently.com",
        password: "password123",
        name: "User 2 (Tab 2)",
      },
    ];

    const userTokens = [];
    console.log("🔐 Setting up user sessions...");
    for (let user of users) {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, user);
      userTokens.push({
        token: response.data.data.token,
        name: user.name,
      });
      console.log(`✅ ${user.name} logged in`);
    }

    // Get events
    const eventsResponse = await axios.get(`${API_BASE_URL}/events`);
    const events = eventsResponse.data.data.events;

    // Find a seat-level booking event
    const seatEvent = events.find(
      (e) => e.seatLevelBooking && e.availableCapacity > 0
    );
    if (!seatEvent) {
      console.log("❌ No seat-level booking events with availability found");
      return;
    }

    console.log(`\n🎭 Testing Event: ${seatEvent.name}`);
    console.log(
      `📊 Initial Capacity: ${seatEvent.availableCapacity}/${seatEvent.capacity}`
    );

    // Get available seats
    const seatsResponse = await axios.get(
      `${API_BASE_URL}/seats/event/${seatEvent.id}`,
      {
        headers: { Authorization: `Bearer ${userTokens[0].token}` },
      }
    );

    const availableSeats = seatsResponse.data.data.sections
      .flatMap((section) => section.seats)
      .filter((seat) => !seat.isBooked && !seat.isBlocked);

    if (availableSeats.length === 0) {
      console.log("❌ No available seats found");
      return;
    }

    // Test Scenario 1: Same seat, different tabs
    console.log("\n🎯 SCENARIO 1: Both tabs try to book the SAME seat");
    const targetSeat1 = availableSeats[0];
    console.log(
      `🪑 Target Seat: ${targetSeat1.row}-${targetSeat1.number} (${targetSeat1.id})`
    );

    // Simulate both tabs booking at the same time
    const sameSeaBjotookingPromises = userTokens.map((user, index) => {
      return axios
        .post(
          `${API_BASE_URL}/seats/book`,
          {
            eventId: seatEvent.id,
            seatIds: [targetSeat1.id],
            idempotencyKey: `multitab-same-${Date.now()}-${index}`,
          },
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        )
        .then((response) => ({
          success: true,
          user: user.name,
          jobId: response.data.data.jobId,
          message: response.data.message,
        }))
        .catch((error) => ({
          success: false,
          user: user.name,
          error: error.response?.data?.message || error.message,
        }));
    });

    console.log("⏳ Both tabs submitting booking requests simultaneously...");
    const sameSeabsults = await Promise.all(sameSeaBjotookingPromises);

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("\n📊 Same Seat Booking Results:");
    let successfulSameSeatBookings = 0;

    for (let result of sameSeabsults) {
      if (result.success) {
        try {
          const statusResponse = await axios.get(
            `${API_BASE_URL}/seats/booking-status/${result.jobId}`,
            { headers: { Authorization: `Bearer ${userTokens[0].token}` } }
          );

          const status = statusResponse.data.data;
          if (status.success) {
            console.log(`✅ ${result.user}: SUCCESS - Got the seat!`);
            successfulSameSeatBookings++;
          } else {
            console.log(`❌ ${result.user}: FAILED - ${status.message}`);
          }
        } catch (error) {
          console.log(`❌ ${result.user}: Error checking status`);
        }
      } else {
        console.log(`❌ ${result.user}: FAILED - ${result.error}`);
      }
    }

    console.log(
      `\n🎯 Same Seat Result: ${successfulSameSeatBookings} out of 2 users got the seat`
    );
    console.log(
      `✅ Expected: Only 1 user should succeed (${
        successfulSameSeatBookings === 1 ? "PASS" : "FAIL"
      })`
    );

    // Test Scenario 2: Different seats, different tabs
    if (availableSeats.length > 1) {
      console.log("\n🎯 SCENARIO 2: Both tabs book DIFFERENT seats");
      const targetSeat2 = availableSeats[1];
      const targetSeat3 = availableSeats[2] || availableSeats[1]; // Fallback if not enough seats

      console.log(`🪑 Tab 1 books: ${targetSeat2.row}-${targetSeat2.number}`);
      console.log(`🪑 Tab 2 books: ${targetSeat3.row}-${targetSeat3.number}`);

      const differentSeatsPromises = [
        // User 1 books seat 2
        axios.post(
          `${API_BASE_URL}/seats/book`,
          {
            eventId: seatEvent.id,
            seatIds: [targetSeat2.id],
            idempotencyKey: `multitab-diff-${Date.now()}-1`,
          },
          {
            headers: { Authorization: `Bearer ${userTokens[0].token}` },
          }
        ),
        // User 2 books seat 3 (or same if only 2 seats available)
        axios.post(
          `${API_BASE_URL}/seats/book`,
          {
            eventId: seatEvent.id,
            seatIds: [targetSeat3.id],
            idempotencyKey: `multitab-diff-${Date.now()}-2`,
          },
          {
            headers: { Authorization: `Bearer ${userTokens[1].token}` },
          }
        ),
      ];

      try {
        console.log("⏳ Both tabs booking different seats...");
        const differentResults = await Promise.all(differentSeatsPromises);

        await new Promise((resolve) => setTimeout(resolve, 3000));

        console.log("\n📊 Different Seats Booking Results:");
        let successfulDifferentBookings = 0;

        for (let i = 0; i < differentResults.length; i++) {
          const result = differentResults[i];
          const user = userTokens[i];

          try {
            const statusResponse = await axios.get(
              `${API_BASE_URL}/seats/booking-status/${result.data.data.jobId}`,
              { headers: { Authorization: `Bearer ${user.token}` } }
            );

            const status = statusResponse.data.data;
            if (status.success) {
              console.log(`✅ ${user.name}: SUCCESS - Booked their seat!`);
              successfulDifferentBookings++;
            } else {
              console.log(`❌ ${user.name}: FAILED - ${status.message}`);
            }
          } catch (error) {
            console.log(`❌ ${user.name}: Error checking status`);
          }
        }

        const expectedSuccessful = targetSeat2.id === targetSeat3.id ? 1 : 2;
        console.log(
          `\n🎯 Different Seats Result: ${successfulDifferentBookings} out of 2 users succeeded`
        );
        console.log(
          `✅ Expected: ${expectedSuccessful} users should succeed (${
            successfulDifferentBookings === expectedSuccessful ? "PASS" : "FAIL"
          })`
        );
      } catch (error) {
        console.log("❌ Different seats test failed:", error.message);
      }
    }

    // Check final event capacity
    const finalEventResponse = await axios.get(
      `${API_BASE_URL}/events/${seatEvent.id}`
    );
    const finalEvent = finalEventResponse.data.data.event;

    console.log(`\n📊 FINAL CAPACITY CHECK:`);
    console.log(
      `   Initial: ${seatEvent.availableCapacity}/${seatEvent.capacity}`
    );
    console.log(
      `   Final:   ${finalEvent.availableCapacity}/${finalEvent.capacity}`
    );
    console.log(
      `   Change:  -${
        seatEvent.availableCapacity - finalEvent.availableCapacity
      }`
    );

    // UI Behavior Summary
    console.log("\n🖥️  UI BEHAVIOR SUMMARY:");
    console.log("=========================");
    console.log("✅ Tab 1 (successful booking):");
    console.log("   → Shows congratulations popup");
    console.log("   → Updates available capacity display");
    console.log("   → Seat becomes unavailable/booked");
    console.log("");
    console.log("❌ Tab 2 (failed booking):");
    console.log("   → Shows error message");
    console.log("   → NO congratulations popup");
    console.log("   → Refreshes seat availability");
    console.log("   → User can select different seat");
  } catch (error) {
    console.error(
      "❌ Multi-tab test failed:",
      error.response?.data?.message || error.message
    );
  }
}

testMultiTabBooking();
