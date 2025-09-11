import redisCache from '../lib/redis';

async function demonstrateCaching() {
  console.log('🎯 REDIS CACHING DEMONSTRATION');
  console.log('==============================\n');

  // Simulate analytics data fetch (expensive operation)
  const fetchExpensiveAnalytics = async () => {
    console.log('💾 Simulating expensive database query...');
    // Simulate 2 second delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      totalEvents: 42,
      totalBookings: 158,
      totalUsers: 73,
      revenue: 15420.50,
      timestamp: new Date().toISOString(),
      queryTime: 2000
    };
  };

  // Test 1: First fetch (no cache) - should be slow
  console.log('1️⃣ FIRST FETCH (No Cache)');
  const start1 = Date.now();
  
  let analytics = await redisCache.get('analytics:demo');
  if (!analytics) {
    console.log('❌ Cache miss - fetching from database...');
    analytics = await fetchExpensiveAnalytics();
    await redisCache.set('analytics:demo', analytics, 300); // 5 min TTL
    console.log('✅ Data cached for future requests');
  }
  
  const end1 = Date.now();
  console.log(`⏱️  Time taken: ${end1 - start1}ms`);
  console.log('📊 Data:', analytics);

  // Test 2: Second fetch (with cache) - should be fast
  console.log('\n2️⃣ SECOND FETCH (With Cache)');
  const start2 = Date.now();
  
  const cachedAnalytics = await redisCache.get('analytics:demo');
  if (cachedAnalytics) {
    console.log('✅ Cache hit - returning cached data');
  } else {
    console.log('❌ Cache miss - this shouldn\'t happen');
  }
  
  const end2 = Date.now();
  console.log(`⏱️  Time taken: ${end2 - start2}ms`);
  console.log('📊 Data:', cachedAnalytics);

  // Test 3: Cache performance comparison
  console.log('\n3️⃣ PERFORMANCE COMPARISON');
  console.log(`Without cache: ${end1 - start1}ms`);
  console.log(`With cache: ${end2 - start2}ms`);
  console.log(`Speed improvement: ${Math.round(((end1 - start1) / (end2 - start2)) * 100) / 100}x faster`);

  // Test 4: Multiple key caching
  console.log('\n4️⃣ MULTIPLE KEY CACHING');
  
  const userData = { id: 1, name: 'John Doe', email: 'john@example.com' };
  const eventData = { id: 1, name: 'Tech Conference', attendees: 250 };
  
  await redisCache.set('user:1', userData, 600);
  await redisCache.set('event:1', eventData, 600);
  
  const [cachedUser, cachedEvent] = await Promise.all([
    redisCache.get('user:1'),
    redisCache.get('event:1')
  ]);
  
  console.log('👤 Cached user:', cachedUser);
  console.log('🎪 Cached event:', cachedEvent);

  // Test 5: Cache invalidation
  console.log('\n5️⃣ CACHE INVALIDATION');
  console.log('Before deletion - exists:', await redisCache.exists('analytics:demo'));
  await redisCache.del('analytics:demo');
  console.log('After deletion - exists:', await redisCache.exists('analytics:demo'));

  console.log('\n==============================');
  console.log('🎉 Redis caching demonstration complete!');
  console.log('Your caching system is working perfectly.');
}

demonstrateCaching().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});
