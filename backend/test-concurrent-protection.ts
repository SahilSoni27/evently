#!/usr/bin/env tsx

// Test concurrent booking protection

import prisma from './src/lib/prisma';
import { seatBookingQueue } from './src/services/seatBookingQueue';

async function testConcurrentBooking() {
  try {
    console.log('🧪 Testing concurrent booking protection...\n');

    // Get the event and find an available seat
    const event = await prisma.event.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        venueDetails: {
          include: {
            sections: {
              include: {
                seats: {
                  include: {
                    seatBookings: {
                      where: {
                        booking: {
                          status: 'CONFIRMED'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!event || !event.venueDetails) {
      console.log('❌ No event found');
      return;
    }

    // Find first available seat
    let availableSeat = null;
    for (const section of event.venueDetails.sections) {
      for (const seat of section.seats) {
        if (seat.seatBookings.length === 0) {
          availableSeat = seat;
          break;
        }
      }
      if (availableSeat) break;
    }

    if (!availableSeat) {
      console.log('❌ No available seats found for testing');
      return;
    }

    console.log(`✅ Found available seat for testing: ${availableSeat.row}${availableSeat.number}`);

    // Create two test users
    const testUser1 = await prisma.user.create({
      data: {
        email: `test1-${Date.now()}@example.com`,
        name: 'Test User 1',
        password: 'password123'
      }
    });

    const testUser2 = await prisma.user.create({
      data: {
        email: `test2-${Date.now()}@example.com`,
        name: 'Test User 2',
        password: 'password123'
      }
    });

    console.log(`✅ Created test users: ${testUser1.email} and ${testUser2.email}`);

    // Create two concurrent booking attempts for the same seat
    console.log(`\n🚀 Attempting concurrent bookings for seat ${availableSeat.row}${availableSeat.number}...`);

    const bookingPromise1 = SeatBookingQueue.addSeatBookingJob({
      userId: testUser1.id,
      eventId: event.id,
      seatIds: [availableSeat.id],
      totalPrice: 50.00
    });

    const bookingPromise2 = SeatBookingQueue.addSeatBookingJob({
      userId: testUser2.id,
      eventId: event.id,
      seatIds: [availableSeat.id],
      totalPrice: 50.00
    });

    // Wait for both to complete
    const [result1, result2] = await Promise.allSettled([bookingPromise1, bookingPromise2]);

    console.log('\n📊 Concurrent booking results:');
    
    if (result1.status === 'fulfilled') {
      console.log(`✅ User 1 result: ${result1.value.success ? 'SUCCESS' : 'FAILED'}`);
      if (result1.value.success) {
        console.log(`   - Booking ID: ${result1.value.bookingId}`);
      } else {
        console.log(`   - Error: ${result1.value.error}`);
      }
    } else {
      console.log(`❌ User 1 result: PROMISE REJECTED - ${result1.reason}`);
    }

    if (result2.status === 'fulfilled') {
      console.log(`✅ User 2 result: ${result2.value.success ? 'SUCCESS' : 'FAILED'}`);
      if (result2.value.success) {
        console.log(`   - Booking ID: ${result2.value.bookingId}`);
      } else {
        console.log(`   - Error: ${result2.value.error}`);
      }
    } else {
      console.log(`❌ User 2 result: PROMISE REJECTED - ${result2.reason}`);
    }

    // Verify only one booking succeeded
    const seatBookings = await prisma.seatBooking.findMany({
      where: {
        seatId: availableSeat.id,
        booking: {
          status: 'CONFIRMED'
        }
      },
      include: {
        booking: {
          include: {
            user: true
          }
        }
      }
    });

    console.log('\n🔍 Verification:');
    console.log(`   - Confirmed bookings for this seat: ${seatBookings.length}`);
    
    if (seatBookings.length === 1) {
      console.log(`   ✅ SUCCESS: Only one booking confirmed`);
      console.log(`   - Winner: ${seatBookings[0].booking.user.email}`);
      console.log(`   - Concurrent booking protection worked!`);
    } else if (seatBookings.length === 0) {
      console.log(`   ❌ ISSUE: No bookings confirmed - both failed`);
    } else {
      console.log(`   ❌ CRITICAL ISSUE: Multiple bookings confirmed - protection failed!`);
    }

    // Cleanup test users
    await prisma.user.delete({ where: { id: testUser1.id } });
    await prisma.user.delete({ where: { id: testUser2.id } });
    console.log('\n🧹 Cleaned up test users');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConcurrentBooking();
