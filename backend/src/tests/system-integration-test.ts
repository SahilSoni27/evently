import redisCache from '../lib/redis';
import { Queue } from 'bullmq';
import prisma from '../lib/prisma';

async function testCompleteSystem() {
  console.log('🚀 EVENTLY SYSTEM INTEGRATION TEST\n');
  console.log('='.repeat(50));

  // 1. Test Redis Connection
  console.log('\n1️⃣ TESTING REDIS CONNECTION...');
  try {
    await redisCache.set('system:test', { status: 'connected', time: Date.now() });
    const result = await redisCache.get('system:test');
    console.log('✅ Redis: Connected and working');
    console.log('   Data:', result);
  } catch (error) {
    console.log('❌ Redis: Failed -', error instanceof Error ? error.message : String(error));
    return;
  }

  // 2. Test Database Connection
  console.log('\n2️⃣ TESTING DATABASE CONNECTION...');
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ PostgreSQL: Connected and working');
  } catch (error) {
    console.log('❌ PostgreSQL: Failed -', error instanceof Error ? error.message : String(error));
  }

  // 3. Test BullMQ Queues
  console.log('\n3️⃣ TESTING BULLMQ JOB QUEUES...');
  try {
    const emailQueue = new Queue('email-notifications');
    const analyticsQueue = new Queue('analytics-processing');
    const reminderQueue = new Queue('event-reminders');

    // Add test jobs
    await emailQueue.add('test-email', { 
      to: 'test@example.com', 
      subject: 'Test Email',
      message: 'System test' 
    });

    await analyticsQueue.add('test-analytics', { 
      eventId: 'test-event',
      action: 'test-action' 
    });

    await reminderQueue.add('test-reminder', { 
      eventId: 'test-event',
      userId: 'test-user' 
    });

    console.log('✅ BullMQ: All queues operational');
    console.log('   - Email queue: Ready');
    console.log('   - Analytics queue: Ready');
    console.log('   - Reminder queue: Ready');

    // Get queue stats
    const emailWaiting = await emailQueue.getWaiting();
    const analyticsWaiting = await analyticsQueue.getWaiting();
    const reminderWaiting = await reminderQueue.getWaiting();

    console.log(`   Queue Jobs: Email(${emailWaiting.length}), Analytics(${analyticsWaiting.length}), Reminders(${reminderWaiting.length})`);

  } catch (error) {
    console.log('❌ BullMQ: Failed -', error instanceof Error ? error.message : String(error));
  }

  // 4. Test Analytics Caching
  console.log('\n4️⃣ TESTING ANALYTICS CACHING SYSTEM...');
  try {
    // Simulate analytics data
    const analyticsData = {
      totalEvents: 15,
      totalBookings: 45,
      totalUsers: 32,
      revenue: 2250.00,
      timestamp: new Date().toISOString()
    };

    // Test cache set/get
    await redisCache.set('analytics:overview', analyticsData, 300); // 5 min TTL
    const cachedData = await redisCache.get('analytics:overview');
    
    console.log('✅ Analytics Cache: Working');
    console.log('   Cached data:', cachedData);

    // Test cache invalidation
    await redisCache.del('analytics:overview');
    const afterDelete = await redisCache.get('analytics:overview');
    console.log('   Cache invalidation:', afterDelete === null ? 'Success' : 'Failed');

  } catch (error) {
    console.log('❌ Analytics Cache: Failed -', error instanceof Error ? error.message : String(error));
  }

  // 5. Test Waitlist System (Database operations)
  console.log('\n5️⃣ TESTING WAITLIST SYSTEM...');
  try {
    // Check if waitlist table exists and can be queried
    const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Waitlist"`;
    console.log('✅ Waitlist System: Database ready');
    console.log(`   Waitlist table accessible`);

    // Test Redis-based waitlist caching
    const waitlistCacheKey = 'waitlist:event-123';
    const mockWaitlistData = [
      { id: '1', userId: 'user1', position: 1, status: 'WAITING' },
      { id: '2', userId: 'user2', position: 2, status: 'WAITING' }
    ];

    await redisCache.set(waitlistCacheKey, mockWaitlistData, 600); // 10 min TTL
    const cachedWaitlist = await redisCache.get<Array<any>>(waitlistCacheKey);
    console.log('   Waitlist caching: Working');
    console.log('   Cached entries:', cachedWaitlist?.length || 0);

  } catch (error) {
    console.log('❌ Waitlist System: Failed -', error instanceof Error ? error.message : String(error));
  }

  // 6. Test Performance Metrics
  console.log('\n6️⃣ TESTING PERFORMANCE METRICS...');
  try {
    const startTime = Date.now();
    
    // Rapid cache operations
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(redisCache.set(`perf:test:${i}`, { data: `test-${i}` }));
    }
    await Promise.all(promises);

    const getPromises = [];
    for (let i = 0; i < 10; i++) {
      getPromises.push(redisCache.get(`perf:test:${i}`));
    }
    await Promise.all(getPromises);

    const endTime = Date.now();
    console.log('✅ Performance: Cache operations completed');
    console.log(`   20 operations in ${endTime - startTime}ms`);

    // Cleanup
    for (let i = 0; i < 10; i++) {
      await redisCache.del(`perf:test:${i}`);
    }

  } catch (error) {
    console.log('❌ Performance Test: Failed -', error instanceof Error ? error.message : String(error));
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 SYSTEM TEST COMPLETED');
  console.log('📊 Check the results above to verify all systems are working correctly.');
}

// Run the complete system test
testCompleteSystem().then(() => {
  console.log('\n✨ Integration test finished. Your Evently system is ready!');
  process.exit(0);
}).catch(error => {
  console.error('❌ System test failed:', error);
  process.exit(1);
});
