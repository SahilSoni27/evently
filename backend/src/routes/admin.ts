import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/admin/analytics
router.get('/analytics', (req, res) => {
  res.status(501).json({
    status: 'error',
    message: 'Admin analytics endpoint not implemented yet'
  });
});

// POST /api/admin/events
router.post('/events', (req, res) => {
  res.status(501).json({
    status: 'error',
    message: 'Admin create event endpoint not implemented yet'
  });
});

// PUT /api/admin/events/:id
router.put('/events/:id', (req, res) => {
  res.status(501).json({
    status: 'error',
    message: 'Admin update event endpoint not implemented yet'
  });
});

// DELETE /api/admin/events/:id
router.delete('/events/:id', (req, res) => {
  res.status(501).json({
    status: 'error',
    message: 'Admin delete event endpoint not implemented yet'
  });
});

// DELETE /api/admin/events/:id/reset-bookings - Reset bookings for testing
router.delete('/events/:id/reset-bookings', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Delete all bookings for this event and reset capacity
  await prisma.$transaction(async (tx) => {
    // Get the event to know its original capacity
    const event = await tx.event.findUnique({
      where: { id },
      select: { capacity: true }
    });

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    // Delete all bookings for this event
    await tx.booking.deleteMany({
      where: { eventId: id }
    });

    // Reset event capacity
    await tx.event.update({
      where: { id },
      data: {
        availableCapacity: event.capacity,
        version: { increment: 1 }
      }
    });
  });

  res.status(200).json({
    status: 'success',
    message: 'Event bookings reset successfully'
  });
}));

export default router;
