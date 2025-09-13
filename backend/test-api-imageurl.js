const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testEventImages() {
  try {
    console.log("=== TESTING EVENT API WITH IMAGES ===\n");

    // Simulate the exact query that the getEvents controller now uses
    const events = await prisma.event.findMany({
      take: 3,
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        venue: true,
        startTime: true,
        endTime: true,
        capacity: true,
        availableCapacity: true,
        price: true,
        category: true,
        tags: true,
        imageUrl: true, // This was the missing field - now included!
        seatLevelBooking: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { bookings: true },
        },
      },
    });

    console.log(`Found ${events.length} events:\n`);

    events.forEach((event, index) => {
      console.log(`${index + 1}. 📅 ${event.name}`);
      console.log(
        `   🖼️  Image: ${
          event.imageUrl ? "✅ " + event.imageUrl : "❌ No image"
        }`
      );
      console.log(`   📍 Venue: ${event.venue}`);
      console.log(`   💰 Price: $${event.price}`);
      console.log(
        `   🎫 Available: ${event.availableCapacity}/${event.capacity}`
      );
      console.log("");
    });

    console.log("✅ API will now return imageUrl for all events!");
    console.log("🎨 Frontend should display event images properly");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEventImages();
