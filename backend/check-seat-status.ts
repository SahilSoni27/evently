#!/usr/bin/env tsx

// Check seat availability and capacity status

import prisma from './src/lib/prisma';

async function checkSeatStatus() {
  try {
    console.log('🔍 Checking seat status...\n');

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

    if (!event) {
      console.log('❌ No events found.');
      return;
    }

    console.log(`Event: "${event.name}" (ID: ${event.id})`);
    console.log(`- Event capacity: ${event.capacity}`);
    console.log(`- Available capacity: ${event.availableCapacity}`);

    if (event.venueDetails) {
      console.log('\nVenue sections:');
      let totalSeats = 0;
      
      for (const section of event.venueDetails.sections) {
        console.log(`- ${section.name}: ${section.seats.length} seats`);
        totalSeats += section.seats.length;
      }
      
      console.log(`\nTotal seats generated: ${totalSeats}`);
      console.log(`Event capacity setting: ${event.capacity}`);
      console.log(`Mismatch: ${totalSeats !== event.capacity ? '❌ YES - NEEDS FIXING' : '✅ NO'}`);
      
      if (totalSeats !== event.capacity) {
        console.log('\n🚨 ISSUE IDENTIFIED:');
        console.log(`   - Seats generated: ${totalSeats}`);
        console.log(`   - Event capacity: ${event.capacity}`);
        console.log('   - This mismatch is causing the booking issues!');
        console.log('\n💡 SOLUTIONS:');
        console.log('   1. Update event capacity to match generated seats (100)');
        console.log('   2. OR regenerate seats to match event capacity (50)');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeatStatus();
