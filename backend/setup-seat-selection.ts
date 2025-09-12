#!/usr/bin/env tsx

// Script to enable seat selection for an event and generate seats

import prisma from './src/lib/prisma';
import { SeatGenerationService } from './src/services/seatGenerationService';

async function enableSeatBookingForEvent() {
  try {
    console.log('🎯 Setting up seat selection for event...\n');

    // Get the first event
    const event = await prisma.event.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!event) {
      console.log('❌ No events found. Please create an event first.');
      return;
    }

    console.log(`✅ Found event: "${event.name}" (ID: ${event.id})`);

    // Enable seat-level booking for this event
    console.log('\n1. Enabling seat-level booking...');
    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: {
        seatLevelBooking: true
      }
    });

    console.log('✅ Seat-level booking enabled');

    // Generate seats for this event
    console.log('\n2. Generating seats...');
    const venueData = {
      name: 'Grand Theater',
      address: '123 Main Street, Downtown',
      capacity: event.capacity, // Use the event's actual capacity
      description: 'A beautiful theater with excellent acoustics',

    console.log(`✅ Generated venue and seats`);
    console.log(`   - Total sections: ${result.sections.length}`);
    
    result.sections.forEach(section => {
      console.log(`   - ${section.name}: ${section.seats.length} seats`);
    });

    console.log('\n🎉 Setup complete!');
    console.log('\n📱 Now you can:');
    console.log(`   1. Go to: http://localhost:3000/events/${event.id}`);
    console.log('   2. You should see the seat selection UI like BookMyShow');
    console.log('   3. Click on individual seats to select them');
    console.log('   4. Book your selected seats');

    console.log('\n🎯 Event Details:');
    console.log(`   - Event: ${event.name}`);
    console.log(`   - URL: http://localhost:3000/events/${event.id}`);
    console.log(`   - Seat-level booking: ${updatedEvent.seatLevelBooking ? '✅ Enabled' : '❌ Disabled'}`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableSeatBookingForEvent();
