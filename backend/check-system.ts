#!/usr/bin/env tsx

// Simple test to check seat booking system status

import prisma from './src/lib/prisma';

async function checkSystem() {
  try {
    console.log('🔍 Checking seat booking system...\n');

    // Check database connection
    console.log('1. Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected. Users: ${userCount}`);

    // Check events
    console.log('\n2. Checking events...');
    const events = await prisma.event.findMany({
      take: 3,
      include: {
        venueDetails: {
          include: {
            sections: {
              include: {
                seats: {
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (events.length === 0) {
      console.log('❌ No events found');
      return;
    }

    console.log(`✅ Found ${events.length} events`);

    // Check seats
    for (const event of events) {
      console.log(`\n   Event: ${event.name}`);
      
      if (event.venueDetails) {
        const totalSeats = event.venueDetails.sections.reduce((total, section) => {
          return total + section.seats.length;
        }, 0);
        console.log(`   - Venue: ${event.venueDetails.name}`);
        console.log(`   - Sections: ${event.venueDetails.sections.length}`);
        console.log(`   - Total seats: ${totalSeats > 0 ? totalSeats : 'Unknown (more than sample)'}`);
      } else {
        console.log(`   - No venue details (legacy venue: ${event.venue})`);
      }
    }

    // Check bookings
    console.log('\n3. Checking recent bookings...');
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        seatBookings: true,
        event: {
          select: { name: true }
        }
      }
    });

    console.log(`✅ Found ${recentBookings.length} recent bookings`);
    
    for (const booking of recentBookings) {
      console.log(`   - ${booking.event.name}: ${booking.seatBookings.length} seats, Status: ${booking.status}`);
    }

    console.log('\n🎉 System check completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the backend server: pnpm run dev');
    console.log('   2. Test seat generation: POST /api/seats/generate');
    console.log('   3. Test seat booking: POST /api/seats/book');
    console.log('   4. Check booking status: GET /api/seats/booking-status/{jobId}');

  } catch (error) {
    console.error('❌ System check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSystem();
