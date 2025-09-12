import prisma from './src/lib/prisma';

async function checkEventFields() {
  try {
    const event = await prisma.event.findUnique({
      where: { id: 'cmfguwc7r0000nvg7epm3zj55' },
      select: {
        id: true,
        name: true,
        seatLevelBooking: true,
        venue: true,
        venueId: true
      }
    });

    console.log('Event data:', JSON.stringify(event, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEventFields();
