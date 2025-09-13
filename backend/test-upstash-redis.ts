#!/usr/bin/env tsx

// Test the Upstash Redis connection with enhanced configuration

import { redisCache } from './src/lib/redis';

async function testUpstashRedisConnection() {
  console.log('🔍 Testing Upstash Redis connection...\n');

  try {
    // Test 1: Health check
    console.log('1. Performing health check...');
    const health = await redisCache.healthCheck();
    console.log('Health status:', health);

    if (health.status === 'healthy') {
      console.log(`✅ Redis is healthy (latency: ${health.latency}ms)`);
    } else {
      console.log(`❌ Redis is unhealthy: ${health.error}`);
      return;
    }

    // Test 2: Basic operations
    console.log('\n2. Testing basic operations...');
    
    // Set a test value
    const setResult = await redisCache.set('test:connection', { 
      timestamp: new Date().toISOString(),
      message: 'Connection test successful'
    }, 60);

    if (setResult) {
      console.log('✅ Set operation successful');
    } else {
      console.log('❌ Set operation failed');
    }

    // Get the test value
    const getValue = await redisCache.get('test:connection');
    if (getValue) {
      console.log('✅ Get operation successful:', getValue);
    } else {
      console.log('❌ Get operation failed');
    }

    // Test 3: Connection status
    console.log('\n3. Checking connection status...');
    const isConnected = redisCache.isConnected();
    console.log('Connection status:', isConnected ? '✅ Connected' : '❌ Disconnected');

    // Test 4: Error handling
    console.log('\n4. Testing error handling...');
    try {
      // Try an operation that might fail
      await redisCache.increment('test:counter', 1);
      console.log('✅ Increment operation successful');
    } catch (error) {
      console.log('❌ Increment operation failed:', error);
    }

    console.log('\n🎉 Redis connection test completed!');

  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
  }
}

testUpstashRedisConnection().finally(() => {
  process.exit(0);
});
