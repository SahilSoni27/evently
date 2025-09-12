// Quick test to verify seat booking queue system

import { addSeatBookingJob, getSeatBookingResult } from './src/services/seatBookingQueue';
import { SeatGenerationService } from './src/services/seatGenerationService';
import prisma from './src/lib/prisma';

async function testSeatBookingQueue() {
  console.log('🧪 Testing Seat Booking Queue System...\n');

  try {
    // Test 1: Generate seats for an event
    console.log('1. Generating seats for a test event...');
    
    // First, let's find an existing event or create test data
    const event = await prisma.event.findFirst({
      include: { venueDetails: true }
    });

    if (!event) {
      console.log('❌ No events found in database. Please create an event first.');
      return;
    }

    console.log(`✅ Found event: ${event.name} (ID: ${event.id})`);

    // Test 2: Generate seats if venue doesn't have any
    if (!event.venueDetails) {
      console.log('2. Creating venue and generating seats...');
      
      const result = await SeatGenerationService.generateSeatsForEvent({
        eventId: event.id,
        capacity: 50,
        venueName: `${event.name} Venue`,
        seatsPerRow: 10,
        sectionConfig: [
          { name: 'General', basePrice: 100, capacity: 50 }
        ]
      });

      console.log(`✅ Generated ${result.totalSeats} seats in venue: ${result.venue.name}`);
    } else {
      console.log('✅ Event already has venue with seats');
    }

    // Test 3: Create multiple concurrent booking jobs
    console.log('\n3. Testing concurrent seat booking...');
    
    // Get some available seats
    const seats = await prisma.seat.findMany({
      where: {
        section: {
          venue: {
            events: {
              some: { id: event.id }
            }
          }
        },
        bookings: {
          none: {}
        }
      },
      take: 5
    });

    if (seats.length === 0) {
      console.log('❌ No available seats found for testing');
      return;
    }

    console.log(`✅ Found ${seats.length} available seats for testing`);

    // Create multiple booking jobs for the same seats (to test queue system)
    const seatIds = seats.slice(0, 3).map(s => s.id);
    
    console.log('\n4. Adding concurrent booking jobs to queue...');
    
    const job1Promise = addSeatBookingJob({
      userId: 'test-user-1',
      eventId: event.id,
      seatIds,
      idempotencyKey: 'test-booking-1',
      timestamp: Date.now()
    });

    const job2Promise = addSeatBookingJob({
      userId: 'test-user-2',
      eventId: event.id,
      seatIds, // Same seats - should cause conflict
      idempotencyKey: 'test-booking-2',
      timestamp: Date.now() + 1
    });

    const [jobId1, jobId2] = await Promise.all([job1Promise, job2Promise]);

    console.log(`✅ Job 1 ID: ${jobId1}`);
    console.log(`✅ Job 2 ID: ${jobId2}`);

    // Wait a bit for queue processing
    console.log('\n5. Waiting for queue processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check results
    const result1 = await getSeatBookingResult(jobId1);
    const result2 = await getSeatBookingResult(jobId2);

    console.log('\n6. Booking Results:');
    console.log('Job 1 Result:', result1?.status, result1?.success ? '✅' : '❌');
    if (result1?.error) console.log('Job 1 Error:', result1.error);
    
    console.log('Job 2 Result:', result2?.status, result2?.success ? '✅' : '❌');
    if (result2?.error) console.log('Job 2 Error:', result2.error);

    // One should succeed, one should fail due to seat conflict
    const successCount = [result1, result2].filter(r => r?.success).length;
    const failCount = [result1, result2].filter(r => r && !r.success).length;

    console.log(`\n📊 Summary: ${successCount} successful, ${failCount} failed bookings`);
    
    if (successCount === 1 && failCount === 1) {
      console.log('🎉 Queue system working correctly! Only one booking succeeded.');
    } else {
      console.log('⚠️  Unexpected results - queue system may need debugging');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSeatBookingQueue()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
