#!/usr/bin/env tsx

// Fix capacity mismatch by updating event capacity to match generated seats

import prisma from './src/lib/prisma';

async function fixCapacityMismatch() {
  try {
    console.log('🔧 Fixing capacity mismatch...\n');

    const event = await prisma.event.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        venueDetails: {
          include: {
            sections: {
              include: {
                seats: true
              }
            }
          }
        }
      }
    });

    if (!event || !event.venueDetails) {
      console.log('❌ No event or venue found.');
      return;
    }

    const totalSeats = event.venueDetails.sections.reduce((total, section) => 
      total + section.seats.length, 0
    );

    console.log(`Current situation:`);
    console.log(`- Event capacity: ${event.capacity}`);
    console.log(`- Generated seats: ${totalSeats}`);
    console.log(`- Available capacity: ${event.availableCapacity}`);

    // Calculate correct available capacity
    // Current bookings: 25 seats (from previous check)
    // So available should be: totalSeats - booked = 100 - 25 = 75
    const bookedSeats = event.capacity - event.availableCapacity; // 50 - 37 = 13 (but we know it's 25)
    
    // Let's get actual booked seats
    const actualBookedSeats = await prisma.seatBooking.count({
      where: {
        booking: {
          eventId: event.id,
          status: 'CONFIRMED'
        }
      }
    });

    const correctAvailableCapacity = totalSeats - actualBookedSeats;

    console.log(`\nActual booked seats: ${actualBookedSeats}`);
    console.log(`Correct available capacity should be: ${correctAvailableCapacity}`);

    // Update event capacity and available capacity
    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: {
        capacity: totalSeats,
        availableCapacity: correctAvailableCapacity
      }
    });

    console.log('\n✅ Fixed capacity mismatch!');
    console.log(`- Updated event capacity: ${updatedEvent.capacity}`);
    console.log(`- Updated available capacity: ${updatedEvent.availableCapacity}`);
    console.log(`- Total seats: ${totalSeats}`);
    console.log(`- Booked seats: ${actualBookedSeats}`);
    console.log(`- Available seats: ${correctAvailableCapacity}`);

    console.log('\n🧪 Now the seat display should correctly show:');
    console.log(`   - All ${totalSeats} seats based on event capacity`);
    console.log(`   - ${actualBookedSeats} seats marked as booked`);
    console.log(`   - ${correctAvailableCapacity} seats available for booking`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCapacityMismatch();
