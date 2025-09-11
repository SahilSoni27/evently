import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { createError, asyncHandler } from '../middleware/errorHandler';
import type { CreateBookingInput } from '../validation/schemas';
import { UserRole } from '../types';
import { withOptimisticLocking, generateIdempotencyKey } from '../utils/retry';
import AnalyticsCache from '../utils/analyticsCache';
import JobScheduler from '../services/jobQueue';

// POST /api/bookings - Create a new booking with optimistic locking
export const createBooking = asyncHandler(async (req: any, res: Response) => {
  const bookingData = req.body as CreateBookingInput;
  const userId = req.user?.id;

  if (!userId) {
    throw createError('User authentication required', 401);
  }

  // Generate idempotency key if not provided
  if (!bookingData.idempotencyKey) {
    bookingData.idempotencyKey = generateIdempotencyKey(userId, bookingData.eventId);
  }

  // Use optimistic locking with retry logic
  const result = await withOptimisticLocking(async () => {
    // Check if event exists and get current state with version
    const event = await prisma.event.findUnique({
      where: { id: bookingData.eventId },
      select: {
        id: true,
        name: true,
        startTime: true,
        availableCapacity: true,
        capacity: true,
        price: true,
        version: true
      }
    });

    if (!event) {
      throw createError('Event not found', 404);
    }

    // Check if event is in the future
    if (event.startTime < new Date()) {
      throw createError('Cannot book tickets for past events', 400);
    }

    // Check if sufficient capacity is available
    if (event.availableCapacity < bookingData.quantity) {
      throw createError(
        `Only ${event.availableCapacity} tickets available, requested ${bookingData.quantity}`,
        400
      );
    }

    // Check for duplicate booking if idempotencyKey is provided
    const existingBooking = await prisma.booking.findFirst({
      where: {
        userId,
        idempotencyKey: bookingData.idempotencyKey
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

    if (existingBooking) {
      // Return the existing booking instead of creating a duplicate
      return {
        booking: existingBooking,
        isNew: false
      };
    }

    // Calculate total price
    const totalPrice = Number(event.price) * bookingData.quantity;

    // Use transaction with optimistic locking
    const booking = await prisma.$transaction(async (tx) => {
      // Update event capacity with version check (optimistic locking)
      const updatedEvent = await tx.event.updateMany({
        where: {
          id: bookingData.eventId,
          version: event.version, // This ensures optimistic locking
          availableCapacity: {
            gte: bookingData.quantity // Double-check capacity
          }
        },
        data: {
          availableCapacity: {
            decrement: bookingData.quantity
          },
          version: {
            increment: 1
          }
        }
      });

      // If no rows were updated, it means either:
      // 1. Version conflict (optimistic locking)
      // 2. Insufficient capacity
      if (updatedEvent.count === 0) {
        // Check if event still exists and get current state
        const currentEvent = await tx.event.findUnique({
          where: { id: bookingData.eventId },
          select: { version: true, availableCapacity: true }
        });

        if (!currentEvent) {
          throw createError('Event not found', 404);
        }

        if (currentEvent.version !== event.version) {
          throw createError('Event capacity changed, please retry', 409);
        }

        if (currentEvent.availableCapacity < bookingData.quantity) {
          throw createError(
            `Only ${currentEvent.availableCapacity} tickets available, requested ${bookingData.quantity}`,
            400
          );
        }

        // This should not happen, but just in case
        throw createError('Failed to update event capacity', 500);
      }

      // Create the booking
      const newBooking = await tx.booking.create({
        data: {
          userId,
          eventId: bookingData.eventId,
          quantity: bookingData.quantity,
          totalPrice,
          idempotencyKey: bookingData.idempotencyKey,
          status: 'CONFIRMED'
        } as any,
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

      return newBooking;
    });

    return {
      booking,
      isNew: true
    };
  });

  const statusCode = result.isNew ? 201 : 200;
  const message = result.isNew ? 'Booking created successfully' : 'Booking already exists';

  // Invalidate analytics cache after successful booking creation
  if (result.isNew) {
    // Fire and forget - don't wait for cache invalidation
    AnalyticsCache.invalidateEventCache(bookingData.eventId).catch(err => 
      console.error('Failed to invalidate analytics cache:', err)
    );

    // Schedule background jobs
    try {
      // Generate QR code for email
      let qrCodeData = '';
      try {
        const { TicketService } = await import('../services/ticketService');
        qrCodeData = await TicketService.generateQRCode(result.booking.id);
      } catch (error) {
        console.error('Failed to generate QR code for email:', error);
      }

      // Send booking confirmation email with QR code
      await JobScheduler.scheduleBookingConfirmation({
        type: 'booking_confirmation',
        to: result.booking.user.email,
        eventId: result.booking.event.id,
        bookingId: result.booking.id,
        eventName: result.booking.event.name,
        userName: result.booking.user.name || 'Guest',
        eventStartTime: result.booking.event.startTime,
        venue: result.booking.event.venue,
        qrCodeData,
        ticketNumber: `EVT-${result.booking.id.substring(0, 8).toUpperCase()}`
      });

      // Schedule event reminder (24 hours before event)
      const reminderTime = new Date(result.booking.event.startTime);
      reminderTime.setHours(reminderTime.getHours() - 24);
      
      if (reminderTime > new Date()) {
        await JobScheduler.scheduleEventReminder({
          type: 'event_reminder',
          to: result.booking.user.email,
          eventId: result.booking.event.id,
          eventName: result.booking.event.name,
          userName: result.booking.user.name || 'Guest',
          eventStartTime: result.booking.event.startTime,
          venue: result.booking.event.venue,
          reminderTime,
        });
      }

      // Update event analytics
      await JobScheduler.scheduleAnalyticsUpdate({
        type: 'update_event_stats',
        eventId: result.booking.event.id,
      });

      // Generate QR code and PDF ticket data for the booking
      // This is done in background so we don't slow down the booking response
      setTimeout(() => {
        import('../services/ticketService').then(({ TicketService }) => {
          TicketService.generateQRCode(result.booking.id).catch(err => 
            console.error('Failed to generate QR code for booking:', result.booking.id, err)
          );
        });
      }, 100);

      // Send push notification for booking confirmation
      setTimeout(() => {
        import('../services/pushNotificationService').then(({ default: PushService }) => {
          PushService.sendBookingConfirmation(result.booking.id).catch(err => 
            console.error('Failed to send booking confirmation push notification:', result.booking.id, err)
          );
        });
      }, 200);
    } catch (jobError) {
      console.error('Failed to schedule background jobs:', jobError);
      // Don't fail the booking creation if job scheduling fails
    }
  }

  // Enhanced response with toast-friendly messages
  const response: any = {
    status: 'success',
    message,
    data: { 
      booking: result.booking,
      ...(result.isNew && {
        ticketLinks: {
          download: `/api/tickets/${result.booking.id}/download`,
          qrCode: `/api/tickets/${result.booking.id}/qr`,
          details: `/api/tickets/${result.booking.id}/details`
        },
        // Toast-friendly confirmation message
        toast: {
          type: 'success',
          title: '🎉 Booking Confirmed!',
          message: `Congratulations! Your booking for "${result.booking.event.name}" has been confirmed. Your tickets are ready!`,
          duration: 8000,
          actions: [
            {
              label: 'Download Ticket',
              action: 'download_ticket',
              url: `/api/tickets/${result.booking.id}/download`
            },
            {
              label: 'View QR Code',
              action: 'view_qr',
              url: `/api/tickets/${result.booking.id}/qr`
            }
          ]
        },
        // Notification details for frontend
        notification: {
          type: 'booking_confirmation',
          title: '🎫 Booking Confirmed',
          message: `Your booking for "${result.booking.event.name}" has been confirmed!`,
          eventName: result.booking.event.name,
          venue: result.booking.event.venue,
          eventDate: result.booking.event.startTime,
          bookingId: result.booking.id,
          quantity: result.booking.quantity,
          totalPrice: Number(result.booking.totalPrice)
        }
      })
    }
  };

  res.status(statusCode).json(response);
});

// GET /api/bookings/user/:userId - Get user bookings
export const getUserBookings = asyncHandler(async (req: any, res: Response) => {
  const { userId } = req.params;
  const requestingUserId = req.user?.id;
  const userRole = req.user?.role;

  // Users can only view their own bookings unless they're admin
  if (requestingUserId !== userId && userRole !== 'ADMIN') {
    throw createError('Access denied. You can only view your own bookings.', 403);
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  // Get user's bookings with event details
  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          description: true,
          venue: true,
          startTime: true,
          endTime: true,
          price: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Enhance bookings with ticket download links and proper formatting
  const enhancedBookings = bookings.map(booking => ({
    id: booking.id,
    quantity: booking.quantity,
    totalPrice: Number(booking.totalPrice),
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    event: booking.event,
    // Add ticket information for confirmed bookings
    ticket: booking.status === 'CONFIRMED' ? {
      ticketNumber: `EVT-${booking.id.substring(0, 8).toUpperCase()}`,
      downloadUrl: `/api/tickets/${booking.id}/download`,
      qrCodeUrl: `/api/tickets/${booking.id}/qr`,
      detailsUrl: `/api/tickets/${booking.id}/details`,
      canDownload: true,
      canView: true
    } : null,
    // User-friendly status and actions
    displayStatus: booking.status === 'CONFIRMED' ? '✅ Confirmed' : 
                  booking.status === 'CANCELLED' ? '❌ Cancelled' : 
                  '⏳ Pending',
    actions: booking.status === 'CONFIRMED' ? [
      {
        label: 'Download Ticket',
        action: 'download',
        url: `/api/tickets/${booking.id}/download`,
        icon: '📱'
      },
      {
        label: 'View QR Code',
        action: 'view_qr',
        url: `/api/tickets/${booking.id}/qr`,
        icon: '📱'
      },
      {
        label: 'Cancel Booking',
        action: 'cancel',
        url: `/api/bookings/${booking.id}`,
        method: 'DELETE',
        icon: '❌',
        confirm: true
      }
    ] : booking.status === 'PENDING' ? [
      {
        label: 'Cancel Booking',
        action: 'cancel',
        url: `/api/bookings/${booking.id}`,
        method: 'DELETE',
        icon: '❌',
        confirm: true
      }
    ] : []
  }));

  res.status(200).json({
    status: 'success',
    message: `📋 Found ${enhancedBookings.length} bookings for ${user.name || user.email}`,
    data: {
      user,
      bookings: enhancedBookings,
      summary: {
        total: enhancedBookings.length,
        confirmed: enhancedBookings.filter(b => b.status === 'CONFIRMED').length,
        cancelled: enhancedBookings.filter(b => b.status === 'CANCELLED').length,
        pending: enhancedBookings.filter(b => b.status === 'PENDING').length
      },
      toast: {
        type: 'info',
        title: 'My Bookings',
        message: `You have ${enhancedBookings.filter(b => b.status === 'CONFIRMED').length} confirmed bookings`,
        duration: 3000
      }
    }
  });
});

// DELETE /api/bookings/:id - Cancel booking with optimistic locking
export const cancelBooking = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    throw createError('User authentication required', 401);
  }

  // Use optimistic locking with retry logic
  await withOptimisticLocking(async () => {
    // Get booking with event details including version
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startTime: true,
            version: true
          }
        }
      }
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    // Check if user owns the booking or is admin
    if (booking.userId !== userId && userRole !== 'ADMIN') {
      throw createError('Access denied. You can only cancel your own bookings.', 403);
    }

    // Check if booking is already cancelled
    if (booking.status === 'CANCELLED') {
      throw createError('Booking is already cancelled', 400);
    }

    // Check if event has already started (allow cancellation up to event start time)
    if (booking.event.startTime <= new Date()) {
      throw createError('Cannot cancel booking for events that have already started', 400);
    }

    // Use transaction with optimistic locking
    await prisma.$transaction(async (tx) => {
      // Cancel the booking
      await tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });

      // Restore event capacity with version check (optimistic locking)
      const updatedEvent = await tx.event.updateMany({
        where: {
          id: booking.eventId,
          version: booking.event.version // Ensure optimistic locking
        },
        data: {
          availableCapacity: {
            increment: booking.quantity
          },
          version: {
            increment: 1
          }
        }
      });

      // If no rows were updated, it means version conflict
      if (updatedEvent.count === 0) {
        throw createError('Event capacity changed, please retry', 409);
      }
    });
  });

  res.status(200).json({
    status: 'success',
    message: 'Booking cancelled successfully',
    data: {
      bookingId: id
    }
  });
});

// GET /api/bookings - Get all bookings (Admin only)
export const getAllBookings = asyncHandler(async (req: any, res: Response) => {
  const userRole = req.user?.role;

  if (userRole !== 'ADMIN') {
    throw createError('Access denied. Admin privileges required.', 403);
  }

  // Parse pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const status = req.query.status as string;

  // Build where clause
  const where = status ? { status: status as any } : {};

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get bookings with pagination
  const [bookings, totalCount] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        event: {
          select: {
            id: true,
            name: true,
            venue: true,
            startTime: true,
            endTime: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.booking.count({ where })
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Enhance bookings with admin-friendly information and download links
  const enhancedBookings = bookings.map(booking => ({
    id: booking.id,
    quantity: booking.quantity,
    totalPrice: Number(booking.totalPrice),
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    user: booking.user,
    event: booking.event,
    // Admin can download any confirmed ticket
    ticket: booking.status === 'CONFIRMED' ? {
      ticketNumber: `EVT-${booking.id.substring(0, 8).toUpperCase()}`,
      downloadUrl: `/api/tickets/${booking.id}/download`,
      qrCodeUrl: `/api/tickets/${booking.id}/qr`,
      detailsUrl: `/api/tickets/${booking.id}/details`,
      canDownload: true,
      canView: true
    } : null,
    // Admin-specific display
    displayStatus: booking.status === 'CONFIRMED' ? '✅ Confirmed' : 
                  booking.status === 'CANCELLED' ? '❌ Cancelled' : 
                  '⏳ Pending',
    adminActions: [
      ...(booking.status === 'CONFIRMED' ? [
        {
          label: 'Download Ticket',
          action: 'download',
          url: `/api/tickets/${booking.id}/download`,
          icon: '📱'
        },
        {
          label: 'View QR Code',
          action: 'view_qr',
          url: `/api/tickets/${booking.id}/qr`,
          icon: '📱'
        }
      ] : []),
      {
        label: 'View User Details',
        action: 'view_user',
        url: `/api/admin/users/${booking.user.id}/details`,
        icon: '👤'
      },
      {
        label: 'Cancel Booking',
        action: 'cancel',
        url: `/api/bookings/${booking.id}`,
        method: 'DELETE',
        icon: '❌',
        confirm: true,
        disabled: booking.status === 'CANCELLED'
      }
    ]
  }));

  res.status(200).json({
    status: 'success',
    message: `📊 Admin View: ${totalCount} total bookings`,
    data: {
      bookings: enhancedBookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage
      },
      summary: {
        total: totalCount,
        confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
        cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
        pending: bookings.filter(b => b.status === 'PENDING').length
      },
      toast: {
        type: 'info',
        title: 'Admin Bookings',
        message: `Viewing ${bookings.length} of ${totalCount} bookings`,
        duration: 3000
      }
    }
  });
});
