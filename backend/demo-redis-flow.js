const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");

console.log("🚀 Starting Redis/BullMQ Demo: Taylor Swift Concert Booking\n");

// Create Redis connection
const redis = new Redis("redis://localhost:6379");

// Create job queues
const emailQueue = new Queue("email-notifications", { connection: redis });
const analyticsQueue = new Queue("analytics-processing", { connection: redis });

async function demonstrateRedisFlow() {
  console.log("📋 Step 1: User tries to book Taylor Swift concert...\n");

  // Simulate user booking data
  const bookingData = {
    userId: "user_12345",
    eventId: "taylor_swift_concert",
    eventName: "Taylor Swift - Eras Tour",
    userEmail: "fan@example.com",
    venue: "Madison Square Garden",
    eventDate: "2025-12-15T20:00:00Z",
    ticketPrice: 250,
  };

  console.log("💳 Booking Data:", JSON.stringify(bookingData, null, 2));
  console.log("\n🔄 Adding jobs to Redis queues...\n");

  // Add email confirmation job
  const emailJob = await emailQueue.add(
    "booking_confirmation",
    {
      type: "booking_confirmation",
      to: bookingData.userEmail,
      eventName: bookingData.eventName,
      venue: bookingData.venue,
      eventStartTime: bookingData.eventDate,
      bookingId: "booking_67890",
    },
    {
      delay: 0, // Send immediately
      attempts: 3, // Retry 3 times if it fails
      backoff: { type: "exponential", delay: 2000 },
    }
  );

  console.log(`✅ Email job added with ID: ${emailJob.id}`);

  // Add analytics job
  const analyticsJob = await analyticsQueue.add(
    "update_event_stats",
    {
      type: "update_event_stats",
      eventId: bookingData.eventId,
      action: "booking_created",
      metadata: {
        revenue: bookingData.ticketPrice,
        timestamp: new Date().toISOString(),
      },
    },
    {
      delay: 5000, // Process analytics after 5 seconds
      attempts: 2,
    }
  );

  console.log(`✅ Analytics job added with ID: ${analyticsJob.id}`);

  return { emailJob, analyticsJob };
}

async function showRedisStructure() {
  console.log("\n🔍 Current Redis Structure:");
  console.log("=".repeat(50));

  const keys = await redis.keys("*");
  console.log(`📊 Total Keys in Redis: ${keys.length}`);

  for (const key of keys.sort()) {
    const type = await redis.type(key);
    let value;

    switch (type) {
      case "string":
        value = await redis.get(key);
        break;
      case "list":
        const length = await redis.llen(key);
        value = `[List with ${length} items]`;
        if (length > 0) {
          const sample = await redis.lrange(key, 0, 2);
          value += ` Sample: ${sample.slice(0, 1)}`;
        }
        break;
      case "hash":
        const fields = await redis.hgetall(key);
        value = `{Hash with ${Object.keys(fields).length} fields}`;
        break;
      case "zset":
        const zcount = await redis.zcard(key);
        value = `[Sorted Set with ${zcount} items]`;
        break;
      case "set":
        const scount = await redis.scard(key);
        value = `[Set with ${scount} items]`;
        break;
    }

    console.log(
      `🔑 ${key} (${type}): ${
        typeof value === "string" && value.length > 100
          ? value.substring(0, 100) + "..."
          : value
      }`
    );
  }
}

async function showJobDetails() {
  console.log("\n📋 Job Queue Status:");
  console.log("=".repeat(50));

  // Email queue stats
  const emailWaiting = await emailQueue.getWaiting();
  const emailActive = await emailQueue.getActive();
  const emailCompleted = await emailQueue.getCompleted();

  console.log(`📧 Email Queue:`);
  console.log(`   • Waiting: ${emailWaiting.length} jobs`);
  console.log(`   • Active: ${emailActive.length} jobs`);
  console.log(`   • Completed: ${emailCompleted.length} jobs`);

  // Analytics queue stats
  const analyticsWaiting = await analyticsQueue.getWaiting();
  const analyticsActive = await analyticsQueue.getActive();
  const analyticsCompleted = await analyticsQueue.getCompleted();

  console.log(`📊 Analytics Queue:`);
  console.log(`   • Waiting: ${analyticsWaiting.length} jobs`);
  console.log(`   • Active: ${analyticsActive.length} jobs`);
  console.log(`   • Completed: ${analyticsCompleted.length} jobs`);

  // Show waiting job details
  if (emailWaiting.length > 0) {
    console.log(`\n📧 Next Email Job Details:`);
    console.log(JSON.stringify(emailWaiting[0].data, null, 2));
  }

  if (analyticsWaiting.length > 0) {
    console.log(`\n📊 Next Analytics Job Details:`);
    console.log(JSON.stringify(analyticsWaiting[0].data, null, 2));
  }
}

async function simulateCaching() {
  console.log("\n💾 Simulating Analytics Caching:");
  console.log("=".repeat(50));

  // Simulate expensive analytics query
  const expensiveData = {
    totalBookings: 1247,
    totalRevenue: 311750,
    averageTicketPrice: 250.2,
    peakHour: "2025-09-11T14:00:00Z",
    conversionRate: 73.2,
  };

  // Cache the data with 5-minute expiry
  await redis.setex(
    "analytics:dashboard_stats",
    300,
    JSON.stringify(expensiveData)
  );
  console.log("✅ Cached dashboard stats for 5 minutes");

  // Check cache
  const cached = await redis.get("analytics:dashboard_stats");
  const ttl = await redis.ttl("analytics:dashboard_stats");

  console.log(`📊 Cached Data: ${cached.substring(0, 50)}...`);
  console.log(`⏰ Time to Live: ${ttl} seconds`);
}

// Run the demonstration
async function runDemo() {
  try {
    // Step 1: Create booking jobs
    await demonstrateRedisFlow();

    // Step 2: Show what's in Redis
    await showRedisStructure();

    // Step 3: Show job queue details
    await showJobDetails();

    // Step 4: Show caching
    await simulateCaching();

    console.log(
      "\n🎉 Demo completed! Check Redis to see the magic happening...\n"
    );
  } catch (error) {
    console.error("❌ Demo failed:", error);
  } finally {
    process.exit(0);
  }
}

runDemo();
