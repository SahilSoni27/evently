const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Connect to our existing Redis instance
const redis = new Redis('redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Use the same queue name as our server
const emailQueue = new Queue('email-notifications', { connection: redis });

async function testNotificationFlow() {
  console.log('🧪 Testing BullMQ Notification Flow\n');
  
  // Add a test email job to the queue
  const job = await emailQueue.add('booking_confirmation', {
    type: 'booking_confirmation',
    to: 'testuser@example.com',
    eventName: 'Test Event - BullMQ Demo',
    venue: 'Test Venue',
    eventStartTime: new Date().toISOString(),
    bookingId: 'TEST_BOOKING_123'
  });
  
  console.log(`✅ Test job added to queue with ID: ${job.id}`);
  console.log(`📧 Email job queued for: testuser@example.com`);
  console.log(`🔄 Worker should pick this up automatically...`);
  console.log(`📊 Check server logs to see success notification!`);
  
  // Check queue status
  const waiting = await emailQueue.getWaiting();
  const active = await emailQueue.getActive();
  const completed = await emailQueue.getCompleted();
  
  console.log(`\n📋 Queue Status:`);
  console.log(`   Waiting: ${waiting.length} jobs`);
  console.log(`   Active: ${active.length} jobs`);
  console.log(`   Completed: ${completed.length} jobs`);
  
  process.exit(0);
}

testNotificationFlow();
