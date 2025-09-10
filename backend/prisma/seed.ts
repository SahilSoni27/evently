import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.booking.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // Create users
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

  console.log('✅ Created users');

  // Create events
  const events = await Promise.all([
    prisma.event.create({
      data: {
        name: 'Tech Conference 2025',
        description: 'Annual technology conference featuring the latest innovations',
        venue: 'San Francisco Convention Center',
        startTime: new Date('2025-12-15T09:00:00Z'),
        endTime: new Date('2025-12-15T18:00:00Z'),
        capacity: 500,
        availableCapacity: 500,
        price: 299.99,
      },
    }),
    prisma.event.create({
      data: {
        name: 'Music Festival',
        description: 'Three-day music festival with top artists',
        venue: 'Central Park',
        startTime: new Date('2025-11-20T14:00:00Z'),
        endTime: new Date('2025-11-22T23:00:00Z'),
        capacity: 10000,
        availableCapacity: 10000,
        price: 199.99,
      },
    }),
    prisma.event.create({
      data: {
        name: 'Startup Pitch Competition',
        description: 'Local entrepreneurs pitch their innovative ideas',
        venue: 'Innovation Hub',
        startTime: new Date('2025-10-30T10:00:00Z'),
        endTime: new Date('2025-10-30T16:00:00Z'),
        capacity: 100,
        availableCapacity: 100,
        price: 49.99,
      },
    }),
    prisma.event.create({
      data: {
        name: 'Food & Wine Expo',
        description: 'Taste the best local cuisine and wines',
        venue: 'Downtown Exhibition Hall',
        startTime: new Date('2025-11-05T12:00:00Z'),
        endTime: new Date('2025-11-05T20:00:00Z'),
        capacity: 300,
        availableCapacity: 300,
        price: 89.99,
      },
    }),
    prisma.event.create({
      data: {
        name: 'AI Workshop',
        description: 'Hands-on workshop on artificial intelligence and machine learning',
        venue: 'Tech Campus Building A',
        startTime: new Date('2025-12-01T09:00:00Z'),
        endTime: new Date('2025-12-01T17:00:00Z'),
        capacity: 50,
        availableCapacity: 50,
        price: 149.99,
      },
    }),
  ]);

  console.log('✅ Created events');

  // Create some sample bookings
  await prisma.booking.create({
    data: {
      userId: regularUser.id,
      eventId: events[0].id,
      quantity: 2,
      totalPrice: 599.98,
      status: 'CONFIRMED',
      idempotencyKey: 'booking-1-user-1',
    },
  });

  await prisma.booking.create({
    data: {
      userId: regularUser2.id,
      eventId: events[1].id,
      quantity: 1,
      totalPrice: 199.99,
      status: 'CONFIRMED',
      idempotencyKey: 'booking-2-user-2',
    },
  });

  console.log('✅ Created bookings');

  // Update available capacity for events with bookings
  await prisma.event.update({
    where: { id: events[0].id },
    data: { availableCapacity: 498 },
  });

  await prisma.event.update({
    where: { id: events[1].id },
    data: { availableCapacity: 9999 },
  });

  console.log('✅ Updated event capacities');
  console.log('🎉 Database seeding completed successfully!');
  console.log('👤 Created 3 users (1 admin, 2 regular)');
  console.log('🎪 Created 5 events');
  console.log('�� Created 2 sample bookings');
  console.log('');
  console.log('📧 Login credentials:');
  console.log('Admin: admin@evently.com / password123');
  console.log('User: user@evently.com / password123');
  console.log('User: jane@evently.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
