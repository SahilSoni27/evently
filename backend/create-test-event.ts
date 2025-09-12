import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestEvent() {
  try {
    // Create venue with sections and seats
    const venue = await prisma.venue.create({
      data: {
        name: 'Test Theater',
        capacity: 100,
        sections: {
          create: [
            {
              name: 'VIP Section',
              capacity: 20,
              priceMultiplier: new Prisma.Decimal(2.0),
              seats: {
                create: [
                  { row: 'A', number: '1', seatType: 'VIP' },
                  { row: 'A', number: '2', seatType: 'VIP' },
                  { row: 'A', number: '3', seatType: 'VIP' },
                  { row: 'B', number: '1', seatType: 'VIP' },
                  { row: 'B', number: '2', seatType: 'VIP' },
                  { row: 'B', number: '3', seatType: 'VIP' },
                ]
              }
            },
            {
              name: 'General Section',
              capacity: 80,
              priceMultiplier: new Prisma.Decimal(1.0),
              seats: {
                create: [
                  { row: 'C', number: '1', seatType: 'REGULAR' },
                  { row: 'C', number: '2', seatType: 'REGULAR' },
                  { row: 'C', number: '3', seatType: 'REGULAR' },
                  { row: 'D', number: '1', seatType: 'REGULAR' },
                  { row: 'D', number: '2', seatType: 'REGULAR' },
                  { row: 'D', number: '3', seatType: 'REGULAR' },
                ]
              }
            }
          ]
        }
      }
    });

    // Create event with seat-level booking
    const event = await prisma.event.create({
      data: {
        name: 'Test Concert with Seat Selection',
        description: 'A test event to demonstrate seat selection functionality',
        venue: 'Test Theater',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
        capacity: 100,
        availableCapacity: 100,
        price: new Prisma.Decimal(50.00),
        category: 'ENTERTAINMENT',
        tags: ['concert', 'music', 'live'],
        seatLevelBooking: true,
        venueId: venue.id
      }
    });

    console.log('✅ Test event created:', event.id);
    console.log('✅ Venue created:', venue.id);
    console.log('📍 Event URL: http://localhost:3001/events/' + event.id);
  } catch (error) {
    console.error('❌ Error creating test event:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestEvent();
