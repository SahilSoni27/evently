// Test different email types
const { Queue } = require("bullmq");
const { Redis } = require("ioredis");

const redisConnection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  }
);

const emailQueue = new Queue("email-notifications", {
  connection: redisConnection,
});

async function testAllEmails() {
  try {
    console.log("🧪 Testing all email types...\n");

    // Test 1: Booking Confirmation
    console.log("1️⃣ Testing booking confirmation...");
    await emailQueue.add("booking_confirmation", {
      type: "booking_confirmation",
      to: "user@evently.com",
      eventName: "React Conference 2024",
      userName: "Alice Johnson",
      eventStartTime: new Date("2024-12-20T14:00:00Z"),
      venue: "Tech Hub Convention Center",
      ticketQuantity: 1,
      totalPrice: 89,
      bookingId: "BK789012",
    });

    // Test 2: Event Reminder
    console.log("2️⃣ Testing event reminder...");
    await emailQueue.add("event_reminder", {
      type: "event_reminder",
      to: "reminder@evently.com",
      eventName: "Web Development Workshop",
      userName: "Bob Smith",
      eventStartTime: new Date("2024-12-22T10:00:00Z"),
      venue: "Digital Learning Center",
      customMessage: "Don't forget to bring your laptop!",
    });

    // Test 3: Waitlist Confirmation
    console.log("3️⃣ Testing waitlist confirmation...");
    await emailQueue.add("waitlist_confirmation", {
      type: "waitlist_confirmation",
      to: "waitlist@evently.com",
      eventName: "JavaScript Bootcamp",
      userName: "Carol Davis",
      eventStartTime: new Date("2024-12-25T09:00:00Z"),
      venue: "Code Academy",
    });

    // Test 4: Waitlist Promotion
    console.log("4️⃣ Testing waitlist promotion...");
    await emailQueue.add("waitlist_promotion", {
      type: "waitlist_promotion",
      to: "promotion@evently.com",
      eventName: "Python Data Science Workshop",
      userName: "Dave Wilson",
      eventStartTime: new Date("2024-12-28T11:00:00Z"),
      venue: "Data Science Institute",
      ticketQuantity: 1,
      totalPrice: 120,
    });

    console.log("\n✅ All email jobs queued successfully!");
    console.log("📧 Check server logs for processing status");
    console.log("🌐 Preview emails at: https://ethereal.email");

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to queue emails:", error);
    process.exit(1);
  }
}

testAllEmails();
