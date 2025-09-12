import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { addSeatBookingJob, getSeatBookingResult } from '../services/seatBookingQueue';
import { SeatGenerationService } from '../services/seatGenerationService';

// GET /api/seats/event/:eventId - Get all seats for an event with sections
export const getSeatsForEvent = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;

  // Get event with venue and seats
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
                    include: {
                      booking: {
                        select: {
                          id: true,
                          status: true,
                          userId: true
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

  if (!event) {
    return res.status(404).json({
      status: 'error',
      message: 'Event not found'
    });
  }

  if (!event.venueDetails || !event.venueDetails.sections) {
    return res.status(400).json({
      status: 'error', 
      message: 'No venue or seats found for this event'
    });
  }

  // Format sections with seats
  const sections = event.venueDetails.sections.map((section: any) => ({
    id: section.id,
    name: section.name,
    capacity: section.capacity,
    priceMultiplier: Number(section.priceMultiplier),
    basePrice: Number(event.price),
    sectionPrice: Number(event.price) * Number(section.priceMultiplier),
    seats: section.seats.map((seat: any) => {
      const confirmedBooking = seat.bookings.find((sb: any) => 
        sb.booking.status === 'CONFIRMED'
      );
      
      return {
        id: seat.id,
        row: seat.row,
        number: seat.number,
        seatType: seat.seatType,
        isBlocked: seat.isBlocked,
        isBooked: !!confirmedBooking,
        price: Number(event.price) * Number(section.priceMultiplier)
      };
    })
  }));

  res.json({
    status: 'success',
    data: {
      event: {
        id: event.id,
        name: event.name,
        seatLevelBooking: event.seatLevelBooking
      },
      venue: {
        id: event.venueDetails.id,
        name: event.venueDetails.name,
        capacity: event.venueDetails.capacity
      },
      sections,
      totalAvailableSeats: sections.reduce((total: number, section: any) => 
        total + section.seats.filter((seat: any) => !seat.isBooked && !seat.isBlocked).length, 0
      )
    }
  });
});

// POST /api/seats/book - Book specific seats using queue system
export const bookSeats = asyncHandler(async (req: Request, res: Response) => {
  const { eventId, seatIds, idempotencyKey } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      status: 'error',
      message: 'User authentication required'
    });
  }

  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Please select at least one seat'
    });
  }

  try {
    // Add booking job to queue
    const jobId = await addSeatBookingJob({
      userId,
      eventId,
      seatIds,
      idempotencyKey,
      timestamp: Date.now()
    });

    res.json({
      status: 'success',
      message: 'Booking request queued successfully',
      data: {
        jobId,
        checkStatusUrl: `/api/seats/booking-status/${jobId}`
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to queue booking request'
    });
  }
});

// GET /api/seats/booking-status/:jobId - Check booking status
export const checkBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  try {
    const result = await getSeatBookingResult(jobId);
    
    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking job not found'
      });
    }

    res.json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to check booking status'
    });
  }
});

// POST /api/seats/generate - Generate seats for an event
export const generateSeatsForEvent = asyncHandler(async (req: Request, res: Response) => {
  const { eventId, capacity, venueName, seatsPerRow, sectionConfig } = req.body;
  const userId = req.user?.id;

  // Only admins can generate seats
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required'
    });
  }

  if (!eventId || !capacity || !venueName) {
    return res.status(400).json({
      status: 'error',
      message: 'eventId, capacity, and venueName are required'
    });
  }

  try {
    const result = await SeatGenerationService.generateSeatsForEvent({
      eventId,
      capacity: parseInt(capacity),
      venueName,
      seatsPerRow: seatsPerRow ? parseInt(seatsPerRow) : 10,
      sectionConfig
    });

    res.json({
      status: 'success',
      message: `Generated ${capacity} seats for event`,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate seats'
    });
  }
});

// GET /api/seats/venue/:venueId - Get venue layout
export const getVenueLayout = asyncHandler(async (req: Request, res: Response) => {
  const { venueId } = req.params;

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      sections: {
        include: {
          seats: {
            orderBy: [
              { row: 'asc' },
              { number: 'asc' }
            ]
          }
        },
        orderBy: { name: 'asc' }
      }
    }
  });

  if (!venue) {
    return res.status(404).json({
      status: 'error',
      message: 'Venue not found'
    });
  }

  res.json({
    status: 'success',
    data: venue
  });
});
