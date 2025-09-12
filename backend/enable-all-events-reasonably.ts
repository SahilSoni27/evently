#!/usr/bin/env tsx

// Enable seat selection for all events with reasonable seat limits

import prisma from './src/lib/prisma';
import { SeatGenerationService } from './src/services/seatGenerationService';

async function enableSeatBookingForAllEventsReasonably() {
  try {
    console.log('🎯 Enabling seat selection for all events (with reasonable limits)...\n');

    // Get all events
    const events = await prisma.event.findMany({
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

    console.log(`Found ${events.length} events total:\n`);

    for (const event of events) {
      console.log(`🎭 Processing: "${event.name}"`);
      console.log(`   - Current capacity: ${event.capacity}`);
      console.log(`   - Seat-level booking: ${event.seatLevelBooking ? 'Enabled' : 'Disabled'}`);

      // Check if event already has seats
      const existingSeats = event.venueDetails?.sections.reduce((total, section) => 
        total + section.seats.length, 0) || 0;

      if (existingSeats > 0) {
        console.log(`   - Already has ${existingSeats} seats`);
        
        if (!event.seatLevelBooking) {
          // Just enable seat-level booking
          await prisma.event.update({
            where: { id: event.id },
            data: { seatLevelBooking: true }
          });
          console.log(`   ✅ Enabled seat-level booking`);
        } else {
          console.log(`   ✅ Already configured`);
        }
      } else {
        console.log(`   - No seats found`);
        
        // Set reasonable limits for seat generation
        let reasonableCapacity = event.capacity;
        
        // Cap large events at reasonable seat counts for demonstration
        if (event.capacity > 1000) {
          reasonableCapacity = 200; // Large festivals -> 200 seats for demo
          console.log(`   - Reducing capacity from ${event.capacity} to ${reasonableCapacity} for demo purposes`);
        } else if (event.capacity > 500) {
          reasonableCapacity = 100; // Medium events -> 100 seats
          console.log(`   - Reducing capacity from ${event.capacity} to ${reasonableCapacity} for demo purposes`);
        }

        // Generate seats
        const result = await SeatGenerationService.generateSeatsForEvent({
          eventId: event.id,
          capacity: reasonableCapacity,
          venueName: `${event.name} - Venue`
        });

        // Update event capacity and enable seat-level booking
        await prisma.event.update({
          where: { id: event.id },
          data: { 
            seatLevelBooking: true,
            capacity: reasonableCapacity,
            availableCapacity: reasonableCapacity
          }
        });

        const totalSeats = result.sections.reduce((total, section) => 
          total + section.seats.length, 0);
        
        console.log(`   ✅ Generated ${totalSeats} seats and updated capacity`);
      }

      console.log(`   📱 URL: http://localhost:3000/events/${event.id}\n`);
    }

    // Final status check
    console.log('🎉 Final Status Check:');
    const finalEvents = await prisma.event.findMany({
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

    finalEvents.forEach(event => {
      const totalSeats = event.venueDetails?.sections.reduce((total, section) => 
        total + section.seats.length, 0) || 0;
      
      console.log(`\n🎭 ${event.name}`);
      console.log(`   - Seat booking: ${event.seatLevelBooking ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`   - Capacity: ${event.capacity}, Seats: ${totalSeats}`);
      console.log(`   - Match: ${totalSeats === event.capacity ? '✅' : '❌ MISMATCH'}`);
      console.log(`   - Status: ${event.seatLevelBooking && totalSeats > 0 ? '✅ Ready for BookMyShow-style booking' : '❌ Needs setup'}`);
    });

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableSeatBookingForAllEventsReasonably();
