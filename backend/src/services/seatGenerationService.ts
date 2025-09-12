import prisma from '../lib/prisma';

interface CreateSeatsForEventData {
  eventId: string;
  capacity: number;
  venueName: string;
  seatsPerRow?: number;
  sectionConfig?: {
    name: string;
    capacity: number;
    priceMultiplier: number;
    seatType: 'REGULAR' | 'VIP' | 'PREMIUM' | 'ACCESSIBLE' | 'STANDING';
  }[];
}

export class SeatGenerationService {
  
  /**
   * Generate seats for an event with automatic numbering (1-100, etc.)
   */
  static async generateSeatsForEvent(data: CreateSeatsForEventData) {
    const { eventId, capacity, venueName, seatsPerRow = 10, sectionConfig } = data;
    
    try {
      // Check if event exists and doesn't already have seats
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          venueDetails: {
            include: {
              sections: {
                include: {
                  seats: true
                }
              }
            }
          }
        }
      });
      
      if (!event) {
        throw new Error('Event not found');
      }
      
      // If event already has seats, don't recreate
      if (event.venueDetails?.sections.some(section => section.seats.length > 0)) {
        console.log(`Event ${eventId} already has seats configured`);
        return event.venueDetails;
      }
      
      // Create venue if doesn't exist
      let venueId = event.venueId;
      if (!venueId) {
        const newVenue = await prisma.venue.create({
          data: {
            name: venueName,
            capacity,
            description: `Auto-generated venue for ${event.name}`
          }
        });
        
        // Link venue to event
        await prisma.event.update({
          where: { id: eventId },
          data: {
            venueId: newVenue.id,
            seatLevelBooking: true
          }
        });
        
        venueId = newVenue.id;
      }
      
      // Use provided section config or create default sections
      const sections = sectionConfig || this.generateDefaultSections(capacity);
      
      // Generate seats for each section
      let currentSeatNumber = 1;
      const createdSections = [];
      
      for (const sectionData of sections) {
        const section = await prisma.venueSection.create({
          data: {
            venueId: venueId,
            name: sectionData.name,
            capacity: sectionData.capacity,
            priceMultiplier: sectionData.priceMultiplier
          }
        });
        
        // Generate seats for this section
        const seats = this.generateSeatsForSection(
          currentSeatNumber,
          sectionData.capacity,
          seatsPerRow,
          sectionData.seatType
        );
        
        // Create seats in database
        const createdSeats = await prisma.seat.createMany({
          data: seats.map(seat => ({
            sectionId: section.id,
            row: seat.row,
            number: seat.number,
            seatType: sectionData.seatType,
            isBlocked: false
          }))
        });
        
        currentSeatNumber += sectionData.capacity;
        createdSections.push({
          ...section,
          seatsCreated: createdSeats.count
        });
      }
      
      console.log(`✅ Generated ${capacity} seats for event ${eventId}`);
      return {
        venueId,
        sections: createdSections,
        totalSeats: capacity
      };
      
    } catch (error) {
      console.error(`❌ Failed to generate seats for event ${eventId}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate default section configuration based on capacity
   */
  private static generateDefaultSections(capacity: number) {
    if (capacity <= 50) {
      // Small venue - single section
      return [{
        name: 'General Admission',
        capacity,
        priceMultiplier: 1.0,
        seatType: 'REGULAR' as const
      }];
    } else if (capacity <= 200) {
      // Medium venue - VIP and General
      const vipSeats = Math.floor(capacity * 0.2); // 20% VIP
      const generalSeats = capacity - vipSeats;
      
      return [
        {
          name: 'VIP Section',
          capacity: vipSeats,
          priceMultiplier: 2.0,
          seatType: 'VIP' as const
        },
        {
          name: 'General Section',
          capacity: generalSeats,
          priceMultiplier: 1.0,
          seatType: 'REGULAR' as const
        }
      ];
    } else {
      // Large venue - Premium, VIP, and General
      const premiumSeats = Math.floor(capacity * 0.1); // 10% Premium
      const vipSeats = Math.floor(capacity * 0.2); // 20% VIP
      const generalSeats = capacity - premiumSeats - vipSeats;
      
      return [
        {
          name: 'Premium Section',
          capacity: premiumSeats,
          priceMultiplier: 3.0,
          seatType: 'PREMIUM' as const
        },
        {
          name: 'VIP Section',
          capacity: vipSeats,
          priceMultiplier: 2.0,
          seatType: 'VIP' as const
        },
        {
          name: 'General Section',
          capacity: generalSeats,
          priceMultiplier: 1.0,
          seatType: 'REGULAR' as const
        }
      ];
    }
  }
  
  /**
   * Generate individual seats with row and seat numbers
   */
  private static generateSeatsForSection(
    startNumber: number,
    sectionCapacity: number,
    seatsPerRow: number,
    seatType: string
  ) {
    const seats = [];
    const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let i = 0; i < sectionCapacity; i++) {
      const seatNumber = startNumber + i;
      const rowIndex = Math.floor(i / seatsPerRow);
      const seatInRow = (i % seatsPerRow) + 1;
      
      seats.push({
        row: rows[rowIndex] || `R${rowIndex + 1}`, // Use letters A-Z, then R1, R2, etc.
        number: seatInRow.toString(),
        globalNumber: seatNumber,
        seatType
      });
    }
    
    return seats;
  }
  
  /**
   * Get detailed seat map for an event
   */
  static async getEventSeatMap(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venueDetails: {
          include: {
            sections: {
              include: {
                seats: {
                  include: {
                    bookings: {
                      where: {
                        booking: {
                          status: 'CONFIRMED'
                        }
                      },
                      include: {
                        booking: {
                          select: {
                            id: true,
                            user: {
                              select: {
                                name: true,
                                email: true
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!event || !event.seatLevelBooking) {
      return null;
    }
    
    // Format seat data with booking information
    const seatMap = event.venueDetails?.sections.map(section => ({
      id: section.id,
      name: section.name,
      capacity: section.capacity,
      priceMultiplier: Number(section.priceMultiplier),
      basePrice: Number(event.price),
      sectionPrice: Number(event.price) * Number(section.priceMultiplier),
      seats: section.seats.map(seat => ({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        seatType: seat.seatType,
        isBlocked: seat.isBlocked,
        isBooked: seat.bookings.length > 0,
        bookedBy: seat.bookings[0]?.booking.user.name || null,
        price: Number(event.price) * Number(section.priceMultiplier)
      }))
    })) || [];
    
    return {
      event: {
        id: event.id,
        name: event.name,
        capacity: event.capacity,
        seatLevelBooking: event.seatLevelBooking
      },
      venue: {
        id: event.venueDetails?.id,
        name: event.venueDetails?.name,
        capacity: event.venueDetails?.capacity
      },
      sections: seatMap,
      totalSeats: seatMap.reduce((total, section) => total + section.seats.length, 0),
      availableSeats: seatMap.reduce((total, section) => 
        total + section.seats.filter(seat => !seat.isBooked && !seat.isBlocked).length, 0
      ),
      bookedSeats: seatMap.reduce((total, section) => 
        total + section.seats.filter(seat => seat.isBooked).length, 0
      )
    };
  }
}
