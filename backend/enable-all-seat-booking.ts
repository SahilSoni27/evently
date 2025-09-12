#!/usr/bin/env tsx

// Enable seat selection for all events

import prisma from './src/lib/prisma';
import { SeatGenerationService } from './src/services/seatGenerationService';

async function enableSeatBookingForAllEvents() {
  try {
    console.log('🎯 Enabling seat selection for all events...\n');

    // Get all events that don't have seat-level booking enabled
    const events = await prisma.event.findMany({
      where: {
        seatLevelBooking: false
      },
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

    console.log(`Found ${events.length} events without seat selection:\n`);

    for (const event of events) {
      console.log(`🎭 Processing: "${event.name}"`);
      console.log(`   - Current capacity: ${event.capacity}`);
      console.log(`   - Seat-level booking: ${event.seatLevelBooking ? 'Enabled' : 'Disabled'}`);

      // Check if event already has seats
      const existingSeats = event.venueDetails?.sections.reduce((total, section) => 
        total + section.seats.length, 0) || 0;

      if (existingSeats > 0) {
        console.log(`   - Already has ${existingSeats} seats, just enabling seat booking...`);
        
        // Just enable seat-level booking
        await prisma.event.update({
          where: { id: event.id },
          data: { seatLevelBooking: true }
        });
        
        console.log(`   ✅ Enabled seat-level booking`);
      } else {
        console.log(`   - No seats found, generating seats...`);
        
        // Generate seats based on event capacity
        const result = await SeatGenerationService.generateSeatsForEvent({
          eventId: event.id,
          capacity: event.capacity,
          venueName: `${event.name} - Venue`
        });

        // Enable seat-level booking
        await prisma.event.update({
          where: { id: event.id },
          data: { seatLevelBooking: true }
        });

        const totalSeats = result.sections.reduce((total, section) => 
          total + section.seats.length, 0);
        
        console.log(`   ✅ Generated ${totalSeats} seats and enabled seat booking`);
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
      console.log(`   - Status: ${event.seatLevelBooking && totalSeats > 0 ? '✅ Ready' : '❌ Needs setup'}`);
    });

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableSeatBookingForAllEvents();
