#!/usr/bin/env tsx

// Test database connection with the new configuration

import { withDatabaseRetry } from './src/utils/database';
import prisma from './src/lib/prisma';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection with retry logic...\n');

  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    await withDatabaseRetry(async () => {
      await prisma.$queryRaw`SELECT 1 as test`;
    });
    console.log('✅ Basic connection successful');

    // Test 2: User count
    console.log('\n2. Testing user query...');
    const userCount = await withDatabaseRetry(async () => {
      return await prisma.user.count();
    });
    console.log(`✅ User count: ${userCount}`);

    // Test 3: Event count  
    console.log('\n3. Testing event query...');
    const eventCount = await withDatabaseRetry(async () => {
      return await prisma.event.count();
    });
    console.log(`✅ Event count: ${eventCount}`);

    // Test 4: Booking count
    console.log('\n4. Testing booking query...');
    const bookingCount = await withDatabaseRetry(async () => {
      return await prisma.booking.count();
    });
    console.log(`✅ Booking count: ${bookingCount}`);

    console.log('\n🎉 All database operations successful!');
    console.log('\n📊 Database Summary:');
    console.log(`👥 Users: ${userCount}`);
    console.log(`🎪 Events: ${eventCount}`);
    console.log(`🎫 Bookings: ${bookingCount}`);

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
