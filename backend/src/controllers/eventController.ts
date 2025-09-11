import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { createError, asyncHandler } from '../middleware/errorHandler';
import type { CreateEventInput, UpdateEventInput, EventQueryInput } from '../validation/schemas';

// GET /api/events - List all events with pagination and search
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  // Extract and parse query parameters with defaults
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string || undefined;
  const sortBy = (req.query.sortBy as string) || 'startTime';
  const sortOrder = (req.query.sortOrder as string) || 'asc';

  // Build where clause for search
  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
      { venue: { contains: search, mode: 'insensitive' as const } }
    ]
  } : {};

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build orderBy clause
  const orderBy = { [sortBy]: sortOrder };

  // Get events with pagination
  const [events, totalCount] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { bookings: true }
        }
      }
    }),
    prisma.event.count({ where })
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.status(200).json({
    status: 'success',
    data: {
      events,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage
      }
    }
  });
});

// GET /api/events/:id - Get single event details
export const getEventById = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      bookings: {
        select: {
          id: true,
          quantity: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      waitlist: {
        select: {
          id: true,
          position: true,
          status: true,
          userId: true,
          createdAt: true
        },
        orderBy: { position: 'asc' }
      },
      _count: {
        select: { 
          bookings: true,
          waitlist: true
        }
      }
    }
  });

  if (!event) {
    throw createError('Event not found', 404);
  }

  // Check user's booking status
  let userBooking = null;
  let userWaitlistPosition = null;
  let canJoinWaitlist = false;

  if (userId) {
    // Check if user has existing booking
    userBooking = event.bookings.find(booking => booking.user.id === userId);
    
    // Check if user is on waitlist
    const userWaitlistEntry = event.waitlist.find(entry => entry.userId === userId);
    if (userWaitlistEntry) {
      userWaitlistPosition = userWaitlistEntry.position;
    }

    // User can join waitlist if:
    // - Event is full (availableCapacity = 0)
    // - User doesn't have a booking
    // - User is not already on waitlist
    // - Event is in the future
    canJoinWaitlist = event.availableCapacity === 0 && 
                     !userBooking && 
                     !userWaitlistEntry &&
                     event.startTime > new Date();
  }

  const responseData = {
    event: {
      ...event,
      // Remove detailed user info from bookings for privacy
      bookings: event.bookings.map(booking => ({
        id: booking.id,
        quantity: booking.quantity,
        status: booking.status,
        createdAt: booking.createdAt
      }))
    },
    userStatus: userId ? {
      hasBooking: !!userBooking,
      bookingId: userBooking?.id,
      waitlistPosition: userWaitlistPosition,
      canJoinWaitlist,
      canBook: event.availableCapacity > 0 && !userBooking && event.startTime > new Date()
    } : null,
    availability: {
      isFull: event.availableCapacity === 0,
      available: event.availableCapacity,
      total: event.capacity,
      waitlistCount: event._count.waitlist,
      bookingsCount: event._count.bookings
    }
  };

  res.status(200).json({
    status: 'success',
    data: responseData
  });
});

// POST /api/events - Create new event (Admin only)
export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const eventData = req.body as CreateEventInput;

  // Check if user is admin (middleware should handle this, but double-check)
  if (req.user?.role !== 'ADMIN') {
    throw createError('Access denied. Admin privileges required.', 403);
  }

  // Convert date strings to Date objects
  const startTime = new Date(eventData.startTime);
  const endTime = eventData.endTime ? new Date(eventData.endTime) : null;

  // Validate dates
  if (startTime < new Date()) {
    throw createError('Event start time cannot be in the past', 400);
  }

  if (endTime && endTime <= startTime) {
    throw createError('Event end time must be after start time', 400);
  }

  const event = await prisma.event.create({
    data: {
      name: eventData.name,
      description: eventData.description,
      venue: eventData.venue,
      startTime,
      endTime,
      capacity: eventData.capacity,
      availableCapacity: eventData.capacity, // Initially same as capacity
      price: eventData.price || 0,
      category: eventData.category || 'OTHER',
      tags: eventData.tags || [],
      imageUrl: eventData.imageUrl
    },
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
      imageUrl: true,
      createdAt: true,
      updatedAt: true
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Event created successfully',
    data: { event }
  });
});

// PUT /api/events/:id - Update event (Admin only)
export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body as UpdateEventInput;

  // Check if user is admin
  if (req.user?.role !== 'ADMIN') {
    throw createError('Access denied. Admin privileges required.', 403);
  }

  // Check if event exists
  const existingEvent = await prisma.event.findUnique({
    where: { id },
    select: { id: true, capacity: true, availableCapacity: true }
  });

  if (!existingEvent) {
    throw createError('Event not found', 404);
  }

  // Prepare update data
  const updatePayload: any = {};

  if (updateData.name) updatePayload.name = updateData.name;
  if (updateData.description !== undefined) updatePayload.description = updateData.description;
  if (updateData.venue) updatePayload.venue = updateData.venue;
  if (updateData.price !== undefined) updatePayload.price = updateData.price;

  // Handle date updates
  if (updateData.startTime) {
    const startTime = new Date(updateData.startTime);
    if (startTime < new Date()) {
      throw createError('Event start time cannot be in the past', 400);
    }
    updatePayload.startTime = startTime;
  }

  if (updateData.endTime) {
    const endTime = new Date(updateData.endTime);
    updatePayload.endTime = endTime;
  }

  // Handle capacity updates carefully
  if (updateData.capacity !== undefined) {
    const bookedTickets = existingEvent.capacity - existingEvent.availableCapacity;
    
    if (updateData.capacity < bookedTickets) {
      throw createError(
        `Cannot reduce capacity below ${bookedTickets} (number of booked tickets)`,
        400
      );
    }

    updatePayload.capacity = updateData.capacity;
    updatePayload.availableCapacity = updateData.capacity - bookedTickets;
  }

  const updatedEvent = await prisma.event.update({
    where: { id },
    data: updatePayload,
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
      updatedAt: true
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Event updated successfully',
    data: { event: updatedEvent }
  });
});

// DELETE /api/events/:id - Delete event (Admin only)
export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if user is admin
  if (req.user?.role !== 'ADMIN') {
    throw createError('Access denied. Admin privileges required.', 403);
  }

  // Check if event exists and has bookings
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: { bookings: true }
      }
    }
  });

  if (!event) {
    throw createError('Event not found', 404);
  }

  // Don't allow deletion if there are active bookings
  if (event._count.bookings > 0) {
    throw createError(
      'Cannot delete event with existing bookings. Cancel all bookings first.',
      400
    );
  }

  await prisma.event.delete({
    where: { id }
  });

  res.status(200).json({
    status: 'success',
    message: 'Event deleted successfully'
  });
});

// GET /api/events/stats - Get event statistics (Admin only)
export const getEventStats = asyncHandler(async (req: Request, res: Response) => {
  // Check if user is admin
  if (req.user?.role !== 'ADMIN') {
    throw createError('Access denied. Admin privileges required.', 403);
  }

  const [
    totalEvents,
    upcomingEvents,
    pastEvents,
    totalBookings,
    totalRevenue
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({
      where: { startTime: { gt: new Date() } }
    }),
    prisma.event.count({
      where: { startTime: { lt: new Date() } }
    }),
    prisma.booking.count({
      where: { status: 'CONFIRMED' }
    }),
    prisma.booking.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { totalPrice: true }
    })
  ]);

  // Get most popular events
  const popularEvents = await prisma.event.findMany({
    take: 5,
    orderBy: {
      bookings: { _count: 'desc' }
    },
    select: {
      id: true,
      name: true,
      venue: true,
      startTime: true,
      _count: {
        select: { bookings: true }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      overview: {
        totalEvents,
        upcomingEvents,
        pastEvents,
        totalBookings,
        totalRevenue: totalRevenue._sum.totalPrice || 0
      },
      popularEvents
    }
  });
});
