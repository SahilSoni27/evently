#!/usr/bin/env tsx

// Test concurrent booking behavior and clean up duplicates

import prisma from './src/lib/prisma';

async function cleanupAndTestConcurrency() {
  try {
    console.log('🧹 Cleaning up duplicate seat bookings...\n');

    // Find the event
    const event = await prisma.event.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!event) {
      console.log('❌ No events found.');
      return;
    }

    console.log(`✅ Found event: "${event.name}" (ID: ${event.id})`);

    // Find all seat bookings for this event
    const seatBookings = await prisma.seatBooking.findMany({
      where: {
        booking: {
          eventId: event.id
        }
      },
      include: {
        seat: true,
        booking: true
      }
    });

    console.log(`\n📊 Current seat bookings: ${seatBookings.length}`);

    // Group by seat to find duplicates
    const seatBookingMap = new Map<string, typeof seatBookings>();
    seatBookings.forEach(booking => {
      const seatKey = `${booking.seat.row}${booking.seat.number}`;
      if (!seatBookingMap.has(seatKey)) {
        seatBookingMap.set(seatKey, []);
      }
      seatBookingMap.get(seatKey)!.push(booking);
    });

    // Find duplicates
    const duplicates: Array<{seatKey: string, bookings: typeof seatBookings}> = [];
    for (const [seatKey, bookings] of seatBookingMap.entries()) {
      if (bookings.length > 1) {
        duplicates.push({ seatKey, bookings });
      }
    }

    console.log(`\n🔍 Found ${duplicates.length} seats with duplicate bookings:`);
    duplicates.forEach(({ seatKey, bookings }) => {
      console.log(`   - Seat ${seatKey}: ${bookings.length} bookings`);
      bookings.forEach((booking, index) => {
        console.log(`     ${index + 1}. Booking ${booking.booking.id} (${booking.booking.status}) - ${booking.booking.createdAt}`);
      });
    });

    // Clean up duplicates (keep the oldest booking)
    if (duplicates.length > 0) {
      console.log('\n🧹 Cleaning up duplicates (keeping oldest booking for each seat)...');
      
      for (const { seatKey, bookings } of duplicates) {
        // Sort by creation date (oldest first)
        bookings.sort((a, b) => a.booking.createdAt.getTime() - b.booking.createdAt.getTime());
        
        // Keep the first (oldest), delete the rest
        const toDelete = bookings.slice(1);
        
        for (const booking of toDelete) {
          console.log(`   - Deleting duplicate seat booking: ${seatKey} from booking ${booking.booking.id}`);
          await prisma.seatBooking.delete({
            where: { id: booking.id }
          });
        }
      }
      
      console.log('✅ Cleanup complete!');
    }

    // Show final status
    const finalBookings = await prisma.seatBooking.findMany({
      where: {
        booking: {
          eventId: event.id,
          status: 'CONFIRMED'
        }
      },
      include: {
        seat: true
      }
    });

    console.log(`\n📈 Final status:`);
    console.log(`   - Event capacity: ${event.capacity}`);
    console.log(`   - Available capacity: ${event.availableCapacity}`);
    console.log(`   - Confirmed seat bookings: ${finalBookings.length}`);
    
    const bookedSeats = finalBookings.map(b => b.seat.row + b.seat.number).sort();
    console.log(`   - Booked seats: ${bookedSeats.join(', ')}`);

    // Test scenario info
    console.log('\n🧪 To test concurrent booking:');
    console.log('   1. Open two browser tabs to the same event');
    console.log('   2. Select the same seat (e.g., A1) in both tabs');
    console.log('   3. Click "Book Selected Seats" in both tabs quickly');
    console.log('   4. Only one should succeed, the other should get an error');
    console.log('   5. Check the congratulations popup only appears for the successful booking');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAndTestConcurrency();
