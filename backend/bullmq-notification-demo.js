const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");

console.log("🚀 BullMQ Notification Flow - Live Demo\n");

// Create Redis connection
const redis = new Redis("redis://localhost:6379", {
  maxRetriesPerRequest: null, // Required for BullMQ
});

// Create notification queue
const notificationQueue = new Queue("notifications", { connection: redis });

// Create worker to process notifications
const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    const { data } = job;

    console.log(`🔄 Worker processing job: ${job.id}`);
    console.log(`📧 Sending ${data.type} to ${data.to}`);

    // Simulate email sending (replace with real email service)
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay

    console.log(`✅ SUCCESS: ${data.type} sent to ${data.to}`);

    // THIS IS THE KEY: Return success data
    return {
      success: true,
      sentAt: new Date().toISOString(),
      recipient: data.to,
      type: data.type,
    };
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

// EVENT LISTENERS - This is where the magic happens!
notificationWorker.on("completed", (job, result) => {
  console.log(`\n🎉 JOB SUCCESS NOTIFICATION:`);
  console.log(`   Job ID: ${job.id}`);
  console.log(`   Result:`, result);
  console.log(`   Duration: ${job.finishedOn - job.processedOn}ms`);

  // HERE YOU CAN:
  // 1. Send success webhook to frontend
  // 2. Update database with success status
  // 3. Trigger follow-up notifications
  // 4. Log to analytics

  // Example: Update database
  console.log(`   📊 Updating database: email_logs table`);
  console.log(`   🔔 Sending real-time notification to admin dashboard`);
});

notificationWorker.on("failed", (job, err) => {
  console.log(`\n❌ JOB FAILED NOTIFICATION:`);
  console.log(`   Job ID: ${job.id}`);
  console.log(`   Error: ${err.message}`);
  console.log(`   Attempt: ${job.attemptsMade}/${job.opts.attempts}`);

  // Handle failures
  if (job.attemptsMade >= job.opts.attempts) {
    console.log(`   💀 Job permanently failed - sending alert to admin`);
  }
});

// Simulate real booking scenario
async function simulateBookingFlow() {
  console.log('📅 User books "Taylor Swift Concert"...\n');

  // Add email notification job
  const job = await notificationQueue.add(
    "booking_confirmation",
    {
      type: "booking_confirmation",
      to: "user@example.com",
      eventName: "Taylor Swift - Eras Tour",
      venue: "Madison Square Garden",
      bookingId: "BOOK_12345",
      eventDate: "2025-12-15T20:00:00Z",
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    }
  );

  console.log(`🎫 Booking completed instantly (100ms response to user)`);
  console.log(`📨 Email job queued with ID: ${job.id}`);
  console.log(`⏳ Waiting for worker to process...\n`);

  // Wait for processing
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Show final state
  const completedJobs = await notificationQueue.getCompleted();
  console.log(`\n📊 FINAL STATUS:`);
  console.log(`   Completed jobs: ${completedJobs.length}`);
  console.log(`   Email sent successfully!`);

  process.exit(0);
}

// Start the demo
simulateBookingFlow();
