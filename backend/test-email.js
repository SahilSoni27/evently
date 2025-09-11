// Simple script to test email functionality
const { Queue } = require("bullmq");
const { Redis } = require("ioredis");

// Create Redis connection
const redisConnection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  }
);

// Create email queue
const emailQueue = new Queue("email-notifications", {
  connection: redisConnection,
});

async function testEmail() {
  try {
    console.log("🧪 Testing email functionality...");

    // Add a booking confirmation email job
    const job = await emailQueue.add("booking_confirmation", {
      type: "booking_confirmation",
      to: "test@evently.com",
      eventName: "Tech Conference 2024",
      userName: "John Doe",
      eventStartTime: new Date("2024-12-15T10:00:00Z"),
      venue: "Convention Center",
      ticketQuantity: 2,
      totalPrice: 150,
      bookingId: "BK123456",
    });

    console.log(`✅ Email job queued with ID: ${job.id}`);
    console.log("📧 Check server logs for email processing...");
    console.log("🌐 Preview emails at: https://ethereal.email");

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to queue email:", error);
    process.exit(1);
  }
}

testEmail();
