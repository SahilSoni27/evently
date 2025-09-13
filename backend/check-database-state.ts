#!/usr/bin/env npx tsx

import prisma from './src/lib/prisma';

async function checkDatabaseState() {
  console.log('🔍 Checking database state...\n');

  try {
    // Get first few events
    const events = await prisma.event.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        capacity: true,
        availableCapacity: true,
        price: true,
        startTime: true
      }
    });

    console.log('📅 Available events:');
    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.name}`);
      console.log(`   ID: ${event.id}`);
      console.log(`   Capacity: ${event.availableCapacity}/${event.capacity}`);
      console.log(`   Price: $${event.price}`);
      console.log(`   Start: ${event.startTime}`);
      console.log('');
    });

    // Get users
    const users = await prisma.user.findMany({
      take: 2,
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    console.log('👥 Available users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Database query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseState();
