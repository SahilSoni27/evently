import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';

// GET /api/seats/event/:eventId - Get available seats for an event
export const getEventSeats = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;

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

  if (!event.seatLevelBooking || !event.venueDetails) {
    return res.status(400).json({
      status: 'error',
      message: 'This event does not support seat selection'
    });
  }

  // Format seat data with availability
  const seatMap = event.venueDetails.sections.map(section => ({
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
      price: Number(event.price) * Number(section.priceMultiplier)
    }))
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
      sections: seatMap,
      totalAvailableSeats: seatMap.reduce((total, section) => 
        total + section.seats.filter(seat => !seat.isBooked && !seat.isBlocked).length, 0
      )
    }
  });
});

// POST /api/seats/book - Book specific seats
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

  // Get event details
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      venueDetails: {
        include: {
          sections: {
            include: {
              seats: {
                where: {
                  id: { in: seatIds }
                },
                include: {
                  section: true,
                  bookings: {
                    where: {
                      booking: {
                        status: 'CONFIRMED'
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

  if (!event.seatLevelBooking) {
    return res.status(400).json({
      status: 'error',
      message: 'This event does not support seat selection'
    });
  }

  // Collect all seats from all sections
  const allSeats = event.venueDetails?.sections.flatMap(section => section.seats) || [];
  
  // Check if all requested seats exist and are available
  const unavailableSeats: any[] = [];
  const availableSeats: any[] = [];
  
  for (const seatId of seatIds) {
    const seat = allSeats.find(s => s.id === seatId);
    if (!seat) {
      return res.status(404).json({
        status: 'error',
        message: `Seat ${seatId} not found`
      });
    }
    
    if (seat.isBlocked || seat.bookings.length > 0) {
      unavailableSeats.push(seat);
    } else {
      availableSeats.push(seat);
    }
  }

  if (unavailableSeats.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Some selected seats are no longer available',
      data: {
        unavailableSeats: unavailableSeats.map(seat => ({
          id: seat.id,
          row: seat.row,
          number: seat.number,
          reason: seat.isBlocked ? 'blocked' : 'already_booked'
        }))
      }
    });
  }

  // Calculate total price
  const totalPrice = availableSeats.reduce((total, seat) => {
    const sectionPrice = Number(event.price) * Number(seat.section.priceMultiplier);
    return total + sectionPrice;
  }, 0);

  // Create booking with seats in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Check for duplicate booking
    if (idempotencyKey) {
      const existingBooking = await tx.booking.findFirst({
        where: {
          userId,
          idempotencyKey
        }
      });

      if (existingBooking) {
        return { booking: existingBooking, isNew: false };
      }
    }

    // Create main booking
    const booking = await tx.booking.create({
      data: {
        userId,
        eventId,
        quantity: seatIds.length,
        totalPrice,
        status: 'CONFIRMED',
        idempotencyKey
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            venue: true,
            startTime: true,
            endTime: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create seat bookings
    const seatBookings = await Promise.all(
      availableSeats.map(seat => 
        tx.seatBooking.create({
          data: {
            bookingId: booking.id,
            seatId: seat.id,
            price: Number(event.price) * Number(seat.section.priceMultiplier)
          }
        })
      )
    );

    return { booking, seatBookings, isNew: true };
  });

  res.status(201).json({
    status: 'success',
    message: 'Seats booked successfully',
    data: {
      booking: result.booking,
      seats: availableSeats.map(seat => ({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        section: seat.section.name,
        price: Number(event.price) * Number(seat.section.priceMultiplier)
      })),
      totalPrice,
      toast: {
        type: 'success',
        title: '🎉 Seats Reserved!',
        message: `Congratulations! Your ${seatIds.length} seat(s) for "${(result.booking as any).event?.name || 'the event'}" have been confirmed!`,
        duration: 8000,
        actions: [
          {
            label: 'Download Ticket',
            action: 'download_ticket',
            url: `/api/tickets/${result.booking.id}/download`
          },
          {
            label: 'View Booking',
            action: 'view_booking',
            url: `/api/bookings/${result.booking.id}`
          }
        ]
      }
    }
  });
});

// GET /api/seats/booking/:bookingId - Get seat details for a booking
export const getBookingSeats = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user?.id;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      seatBookings: {
        include: {
          seat: {
            include: {
              section: true
            }
          }
        }
      },
      event: {
        select: {
          id: true,
          name: true,
          venue: true,
          startTime: true,
          seatLevelBooking: true
        }
      }
    }
  });

  if (!booking) {
    return res.status(404).json({
      status: 'error',
      message: 'Booking not found'
    });
  }

  // Check access permission
  if (booking.userId !== userId && req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied'
    });
  }

  const seatDetails = booking.seatBookings.map(seatBooking => ({
    id: seatBooking.seat.id,
    row: seatBooking.seat.row,
    number: seatBooking.seat.number,
    seatType: seatBooking.seat.seatType,
    section: seatBooking.seat.section.name,
    price: Number(seatBooking.price)
  }));

  res.json({
    status: 'success',
    data: {
      booking: {
        id: booking.id,
        quantity: booking.quantity,
        totalPrice: Number(booking.totalPrice),
        status: booking.status
      },
      event: booking.event,
      seats: seatDetails,
      hasSeatSelection: booking.event.seatLevelBooking && seatDetails.length > 0
    }
  });
});
