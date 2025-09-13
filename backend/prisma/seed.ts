import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.booking.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@evently.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@evently.com',
      name: 'John Doe',
      password: hashedPassword,
      role: 'USER',
    },
  });

  const regularUser2 = await prisma.user.create({
    data: {
      email: 'jane@evently.com',
      name: 'Jane Smith',
      password: hashedPassword,
      role: 'USER',
    },
  });

  console.log('✅ Created 3 users');

  // Create events one by one to avoid connection issues  
  console.log('Creating events...');
  
  const event1 = await prisma.event.create({
    data: {
      name: 'Tech Conference 2025',
      description: 'Annual technology conference featuring the latest innovations in AI, Web3, and Cloud Computing',
      venue: 'San Francisco Convention Center',
      startTime: new Date('2025-12-15T09:00:00Z'),
      endTime: new Date('2025-12-15T18:00:00Z'),
      capacity: 500,
      availableCapacity: 500,
      price: 299.99,
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&crop=center',
      seatLevelBooking: false,
    },
  });
  console.log('✅ Created Tech Conference');

  const event2 = await prisma.event.create({
    data: {
      name: 'Summer Music Festival',
      description: 'Three-day outdoor music festival featuring top international artists',
      venue: 'Central Park Amphitheater',
      startTime: new Date('2025-11-20T14:00:00Z'),
      endTime: new Date('2025-11-22T23:00:00Z'),
      capacity: 10000,
      availableCapacity: 10000,
      price: 199.99,
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&crop=center',
      seatLevelBooking: false,
    },
  });
  console.log('✅ Created Music Festival');

  const event3 = await prisma.event.create({
    data: {
      name: 'Theater Show - BookMyShow Style',
      description: 'Premium theater experience with individual seat selection - Hamilton Musical',
      venue: 'Grand Theater',
      startTime: new Date('2025-10-30T19:30:00Z'),
      endTime: new Date('2025-10-30T22:00:00Z'),
      capacity: 100,
      availableCapacity: 100,
      price: 75.99,
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&crop=center',
      seatLevelBooking: true,
    },
  });
  console.log('✅ Created Theater Show');

  const event4 = await prisma.event.create({
    data: {
      name: 'Food & Wine Expo',
      description: 'Taste the best local cuisine and premium wines from around the world',
      venue: 'Downtown Exhibition Hall',
      startTime: new Date('2025-11-05T12:00:00Z'),
      endTime: new Date('2025-11-05T20:00:00Z'),
      capacity: 300,
      availableCapacity: 300,
      price: 89.99,
      imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop&crop=center',
      seatLevelBooking: false,
    },
  });
  console.log('✅ Created Food & Wine Expo');

  const event5 = await prisma.event.create({
    data: {
      name: 'AI Workshop - Premium Seating',
      description: 'Hands-on AI/ML workshop with assigned premium seats and personal laptops',
      venue: 'Tech Campus Building A',
      startTime: new Date('2025-12-01T09:00:00Z'),
      endTime: new Date('2025-12-01T17:00:00Z'),
      capacity: 50,
      availableCapacity: 50,
      price: 149.99,
      imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop&crop=center',
      seatLevelBooking: true,
    },
  });
  console.log('✅ Created AI Workshop');

  const events = [event1, event2, event3, event4, event5];
  console.log('✅ Created 5 events with images');

  // Generate seats for events with seatLevelBooking enabled
  console.log('Generating seats for seat-level booking events...');
  const { SeatGenerationService } = await import('../src/services/seatGenerationService');
  
  // Generate seats for Theater Show
  try {
    await SeatGenerationService.generateSeatsForEvent({
      eventId: event3.id,
      capacity: event3.capacity,
      venueName: 'Grand Theater'
    });
    console.log(`✅ Generated ${event3.capacity} seats for Theater Show`);
  } catch (error) {
    console.error('❌ Failed to generate seats for Theater Show:', error);
  }

  // Generate seats for AI Workshop
  try {
    await SeatGenerationService.generateSeatsForEvent({
      eventId: event5.id,
      capacity: event5.capacity,
      venueName: 'Tech Campus Building A'
    });
    console.log(`✅ Generated ${event5.capacity} seats for AI Workshop`);
  } catch (error) {
    console.error('❌ Failed to generate seats for AI Workshop:', error);
  }

  // Create some sample bookings for non-seat events
  console.log('Creating sample bookings...');
  
  try {
    const booking1 = await prisma.booking.create({
      data: {
        userId: regularUser.id,
        eventId: event1.id,
        quantity: 2,
        totalPrice: 599.98,
        status: 'CONFIRMED',
        idempotencyKey: 'booking-1-user-1',
      },
    });
    console.log('✅ Created booking for Tech Conference');

    const booking2 = await prisma.booking.create({
      data: {
        userId: regularUser2.id,
        eventId: event2.id,
        quantity: 3,
        totalPrice: 599.97,
        status: 'CONFIRMED',
        idempotencyKey: 'booking-2-user-2',
      },
    });
    console.log('✅ Created booking for Music Festival');

    // Update available capacity for events with bookings
    await prisma.event.update({
      where: { id: event1.id },
      data: { availableCapacity: 498 },
    });

    await prisma.event.update({
      where: { id: event2.id },
      data: { availableCapacity: 9997 },
    });

    console.log('✅ Updated event capacities');
  } catch (error) {
    console.error('❌ Failed to create sample bookings:', error);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('👤 Created 3 users (1 admin, 2 regular)');
  console.log('🎪 Created 5 events with images:');
  console.log('   • Tech Conference 2025 (Regular booking, 500 capacity)');
  console.log('   • Summer Music Festival (Regular booking, 10,000 capacity)');
  console.log('   • Theater Show - BookMyShow Style (Seat selection, 100 seats)');
  console.log('   • Food & Wine Expo (Regular booking, 300 capacity)');
  console.log('   • AI Workshop - Premium Seating (Seat selection, 50 seats)');
  console.log('🎟️ Created 2 sample bookings');
  console.log('🪑 Generated individual seats for 2 seat-level events');
  console.log('');
  console.log('📧 Login credentials:');
  console.log('Admin: admin@evently.com / password123');
  console.log('User: user@evently.com / password123');
  console.log('User: jane@evently.com / password123');
  console.log('');
  console.log('🌐 Frontend URLs:');
  console.log('• View all events: http://localhost:3000/events');
  console.log('• Admin dashboard: http://localhost:3000/admin');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
