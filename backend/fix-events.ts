import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEventsAndImages() {
  console.log('🔧 Fixing events and adding images...');
  
  try {
    // Update existing events with images
    const updates = [
      {
        name: 'Tech Conference 2025',
        imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&crop=center'
      },
      {
        name: 'Food & Wine Expo', 
        imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop&crop=center'
      },
      {
        name: 'Theater Show - BookMyShow Style',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&crop=center'
      },
      {
        name: 'AI Workshop - Premium Seating',
        imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop&crop=center'
      }
    ];
    
    for (const update of updates) {
      await prisma.event.updateMany({
        where: { name: update.name },
        data: { imageUrl: update.imageUrl }
      });
      console.log(`✅ Updated ${update.name}`);
    }
    
    // Check if Music Festival exists
    const musicFestival = await prisma.event.findFirst({
      where: { name: 'Summer Music Festival' }
    });
    
    if (!musicFestival) {
      await prisma.event.create({
        data: {
          name: 'Summer Music Festival',
          description: 'Three-day outdoor music festival featuring top international artists',
          venue: 'Central Park Amphitheater',
          startTime: new Date('2025-11-20T14:00:00Z'),
          endTime: new Date('2025-11-22T23:00:00Z'),
          capacity: 10000,
          availableCapacity: 10000,
          price: 199.99,
          imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&crop=center',
          seatLevelBooking: false
        }
      });
      console.log('✅ Created Summer Music Festival');
    }
    
    // Verify final state
    const allEvents = await prisma.event.findMany({
      select: { name: true, imageUrl: true, seatLevelBooking: true, capacity: true }
    });
    
    console.log('\n📊 Final Event Summary:');
    allEvents.forEach((event, i) => {
      console.log(`${i + 1}. ${event.name}`);
      console.log(`   - Type: ${event.seatLevelBooking ? 'Seat Selection' : 'Quantity Booking'}`);
      console.log(`   - Capacity: ${event.capacity}`);
      console.log(`   - Image: ${event.imageUrl ? '✅' : '❌'}`);
    });
    
    console.log('\n🎉 All events updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEventsAndImages();
