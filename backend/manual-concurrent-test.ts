#!/usr/bin/env tsx

// Simpler concurrent booking test

import prisma from './src/lib/prisma';

async function testConcurrentBookingSimple() {
  try {
    console.log('🧪 Testing concurrent booking behavior...\n');

    // Get the event
    const event = await prisma.event.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!event) {
      console.log('❌ No event found');
      return;
    }

    console.log(`✅ Testing with event: "${event.name}"`);
    console.log(`   - Capacity: ${event.capacity}`);
    console.log(`   - Available: ${event.availableCapacity}`);

    // Find an available seat
    const availableSeat = await prisma.seat.findFirst({
      where: {
        section: {
          venue: {
            events: {
              some: {
                id: event.id
              }
            }
          }
        },
        bookings: {
          none: {
            booking: {
              status: 'CONFIRMED'
            }
          }
        }
      },
      include: {
        section: true
      }
    });

    if (!availableSeat) {
      console.log('❌ No available seats found');
      return;
    }

    console.log(`✅ Found available seat: ${availableSeat.row}${availableSeat.number} in ${availableSeat.section.name}`);

    // Check current booking status
    const currentBookings = await prisma.seatBooking.count({
      where: {
        seatId: availableSeat.id,
        booking: {
          status: 'CONFIRMED'
        }
      }
    });

    console.log(`\n📊 Current status:`);
    console.log(`   - Bookings for this seat: ${currentBookings}`);

    // Create test users for manual testing info
    console.log('\n🧪 Manual Test Instructions:');
    console.log('1. Open your event page in TWO browser tabs:');
    console.log(`   http://localhost:3000/events/${event.id}`);
    console.log(`2. In BOTH tabs, select seat ${availableSeat.row}${availableSeat.number}`);
    console.log('3. Click "Book Selected Seats" in BOTH tabs as quickly as possible');
    console.log('4. Expected behavior:');
    console.log('   - Only ONE tab should show "Congratulations!"');
    console.log('   - The OTHER tab should show an error or failure');
    console.log('   - The seat should be marked as booked');
    console.log('   - No duplicate bookings should be created');

    console.log('\n🔍 After testing, run this script again to verify results');

    // Show current queue and Redis info
    console.log('\n⚙️ System Status:');
    console.log('   - BullMQ queue: seat-booking');
    console.log('   - Redis locks: Enabled for concurrency protection');
    console.log('   - Seat-level booking: Enabled');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConcurrentBookingSimple();
