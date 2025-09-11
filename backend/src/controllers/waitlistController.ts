import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { createError, asyncHandler } from '../middleware/errorHandler';
import JobScheduler from '../services/jobQueue';
import AnalyticsCache from '../utils/analyticsCache';

// POST /api/events/:eventId/waitlist - Join event waitlist
export const joinWaitlist = asyncHandler(async (req: any, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw createError('User authentication required', 401);
  }

  // Check if event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      startTime: true,
      availableCapacity: true,
      capacity: true
    }
  });

  if (!event) {
    throw createError('Event not found', 404);
  }

  // Check if event is in the future
  if (event.startTime < new Date()) {
    throw createError('Cannot join waitlist for past events', 400);
  }

  // Check if event has available capacity
  if (event.availableCapacity > 0) {
    throw createError('Event has available capacity. Please book directly instead of joining waitlist.', 400);
  }

  // Check if user is already on waitlist
  const existingWaitlistEntry = await prisma.waitlist.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId
      }
    }
  });

  if (existingWaitlistEntry) {
    return res.status(200).json({
      status: 'success',
      message: 'You are already on the waitlist for this event',
      data: { waitlistEntry: existingWaitlistEntry }
    });
  }

  // Check if user already has a booking for this event
  const existingBooking = await prisma.booking.findFirst({
    where: {
      userId,
      eventId,
      status: { in: ['CONFIRMED', 'PENDING'] }
    }
  });

  if (existingBooking) {
    throw createError('You already have a booking for this event', 400);
  }

  // Get current waitlist position
  const currentWaitlistCount = await prisma.waitlist.count({
    where: { eventId }
  });

  // Add user to waitlist
  const waitlistEntry = await prisma.waitlist.create({
    data: {
      userId,
      eventId,
      position: currentWaitlistCount + 1,
      status: 'ACTIVE'
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          venue: true,
          startTime: true
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

  // Send waitlist confirmation email
  try {
    await JobScheduler.scheduleBookingConfirmation({
      type: 'booking_confirmation',
      to: waitlistEntry.user.email,
      eventId: waitlistEntry.event.id,
      eventName: waitlistEntry.event.name,
      userName: waitlistEntry.user.name || 'Guest',
      eventStartTime: waitlistEntry.event.startTime,
      venue: waitlistEntry.event.venue,
      customMessage: `You have been added to the waitlist at position ${waitlistEntry.position}. You will be notified if a spot becomes available.`
    });
  } catch (jobError) {
    console.error('Failed to schedule waitlist confirmation email:', jobError);
  }

  res.status(201).json({
    status: 'success',
    message: 'Successfully joined event waitlist',
    data: { waitlistEntry }
  });
});

// DELETE /api/events/:eventId/waitlist - Leave event waitlist
export const leaveWaitlist = asyncHandler(async (req: any, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw createError('User authentication required', 401);
  }

  // Find and remove waitlist entry
  const waitlistEntry = await prisma.waitlist.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId
      }
    }
  });

  if (!waitlistEntry) {
    throw createError('You are not on the waitlist for this event', 404);
  }

  // Remove from waitlist and update positions
  await prisma.$transaction(async (tx) => {
    // Delete the waitlist entry
    await tx.waitlist.delete({
      where: {
        userId_eventId: {
          userId,
          eventId
        }
      }
    });

    // Update positions of users who were behind this user
    await tx.waitlist.updateMany({
      where: {
        eventId,
        position: { gt: waitlistEntry.position }
      },
      data: {
        position: { decrement: 1 }
      }
    });
  });

  res.json({
    status: 'success',
    message: 'Successfully left event waitlist'
  });
});

// GET /api/events/:eventId/waitlist - Get waitlist for event (admin only)
export const getEventWaitlist = asyncHandler(async (req: any, res: Response) => {
  const { eventId } = req.params;
  const userRole = req.user?.role;

  // Only admins can view event waitlists
  if (userRole !== 'ADMIN') {
    throw createError('Access denied. Admin privileges required.', 403);
  }

  const { page = '1', limit = '10' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Get waitlist entries with user details
  const [waitlistEntries, totalCount] = await Promise.all([
    prisma.waitlist.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { position: 'asc' },
      skip,
      take: limitNum
    }),
    prisma.waitlist.count({
      where: { eventId }
    })
  ]);

  res.json({
    status: 'success',
    data: {
      waitlistEntries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    }
  });
});

// GET /api/users/:userId/waitlist - Get user's waitlist entries
export const getUserWaitlist = asyncHandler(async (req: any, res: Response) => {
  const { userId } = req.params;
  const requestingUserId = req.user?.id;
  const userRole = req.user?.role;

  // Users can only view their own waitlist unless they're admin
  if (requestingUserId !== userId && userRole !== 'ADMIN') {
    throw createError('Access denied. You can only view your own waitlist.', 403);
  }

  const waitlistEntries = await prisma.waitlist.findMany({
    where: { 
      userId,
      status: 'ACTIVE'
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          venue: true,
          startTime: true,
          endTime: true,
          capacity: true,
          availableCapacity: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    status: 'success',
    data: { waitlistEntries }
  });
});

// POST /api/admin/events/:eventId/waitlist/promote - Promote users from waitlist when spots become available
export const promoteFromWaitlist = asyncHandler(async (req: any, res: Response) => {
  const { eventId } = req.params;
  const { spotsAvailable = 1 } = req.body;
  const userRole = req.user?.role;

  // Only admins can promote from waitlist
  if (userRole !== 'ADMIN') {
    throw createError('Access denied. Admin privileges required.', 403);
  }

  // Get next users from waitlist
  const waitlistUsers = await prisma.waitlist.findMany({
    where: { 
      eventId,
      status: 'ACTIVE'
    },
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
          price: true
        }
      }
    },
    orderBy: { position: 'asc' },
    take: spotsAvailable
  });

  if (waitlistUsers.length === 0) {
    return res.json({
      status: 'success',
      message: 'No users to promote from waitlist',
      data: { promotedUsers: [] }
    });
  }

  const promotedUsers: Array<{
    userId: string;
    email: string;
    name: string | null;
    bookingId: string;
  }> = [];

  // Process each user in the waitlist
  for (const waitlistUser of waitlistUsers) {
    try {
      await prisma.$transaction(async (tx) => {
        // Create booking for the user
        const booking = await tx.booking.create({
          data: {
            userId: waitlistUser.userId,
            eventId: waitlistUser.eventId,
            quantity: 1, // Default to 1 ticket
            totalPrice: waitlistUser.event.price,
            status: 'CONFIRMED',
            idempotencyKey: `waitlist_promotion_${waitlistUser.userId}_${waitlistUser.eventId}_${Date.now()}`
          }
        });

        // Update event capacity
        await tx.event.update({
          where: { id: waitlistUser.eventId },
          data: {
            availableCapacity: { decrement: 1 }
          }
        });

        // Remove user from waitlist
        await tx.waitlist.delete({
          where: {
            userId_eventId: {
              userId: waitlistUser.userId,
              eventId: waitlistUser.eventId
            }
          }
        });

        // Update positions of remaining waitlist users
        await tx.waitlist.updateMany({
          where: {
            eventId: waitlistUser.eventId,
            position: { gt: waitlistUser.position }
          },
          data: {
            position: { decrement: 1 }
          }
        });

        promotedUsers.push({
          userId: waitlistUser.userId,
          email: waitlistUser.user.email,
          name: waitlistUser.user.name,
          bookingId: booking.id
        });
      });

      // Send booking confirmation email
      try {
        await JobScheduler.scheduleBookingConfirmation({
          type: 'booking_confirmation',
          to: waitlistUser.user.email,
          eventId: waitlistUser.event.id,
          eventName: waitlistUser.event.name,
          userName: waitlistUser.user.name || 'Guest',
          eventStartTime: waitlistUser.event.startTime,
          venue: waitlistUser.event.venue,
          customMessage: 'Great news! A spot opened up and you have been automatically booked for this event.'
        });
      } catch (emailError) {
        console.error('Failed to send promotion email:', emailError);
      }

      // Send push notification for waitlist promotion
      setTimeout(() => {
        import('../services/pushNotificationService').then(({ default: PushService }) => {
          PushService.sendWaitlistPromotion(waitlistUser.id).catch(err => 
            console.error('Failed to send waitlist promotion push notification:', waitlistUser.id, err)
          );
        });
      }, 100);

    } catch (error) {
      console.error(`Failed to promote user ${waitlistUser.userId} from waitlist:`, error);
    }
  }

  // Invalidate analytics cache
  AnalyticsCache.invalidateEventCache(eventId).catch(err => 
    console.error('Failed to invalidate analytics cache:', err)
  );

  res.json({
    status: 'success',
    message: `Successfully promoted ${promotedUsers.length} users from waitlist`,
    data: { promotedUsers }
  });
});

export default {
  joinWaitlist,
  leaveWaitlist,
  getEventWaitlist,
  getUserWaitlist,
  promoteFromWaitlist
};
