import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔗 Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    // Count records
    const userCount = await prisma.user.count();
    const eventCount = await prisma.event.count();
    const bookingCount = await prisma.booking.count();
    
    console.log(`📊 Database stats:`);
    console.log(`  👥 Users: ${userCount}`);
    console.log(`  🎉 Events: ${eventCount}`);
    console.log(`  🎫 Bookings: ${bookingCount}`);
    
    // Test a query
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        capacity: true,
        availableCapacity: true,
      },
      take: 3,
    });
    
    console.log(`\n🎪 Sample events:`);
    events.forEach(event => {
      console.log(`  • ${event.name}: ${event.availableCapacity}/${event.capacity} available`);
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
