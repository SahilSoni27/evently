import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler, createError } from '../middleware/errorHandler';

// Simulate payment processing (in real app, integrate with Stripe/PayPal)
const processPayment = async (amount: number, paymentMethod: string, bookingId: string) => {
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate payment success/failure (90% success rate)
  const isSuccess = Math.random() > 0.1;
  
  if (!isSuccess) {
    throw new Error('Payment processing failed');
  }
  
  return {
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'completed',
    amount,
    paymentMethod,
    processedAt: new Date()
  };
};

// POST /api/payments/process - Process payment for a booking
export const processBookingPayment = asyncHandler(async (req: any, res: Response) => {
  const { bookingId, paymentMethod, cardDetails } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw createError('User authentication required', 401);
  }

  // Validate required fields
  if (!bookingId || !paymentMethod) {
    throw createError('Booking ID and payment method are required', 400);
  }

  // Get the booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          venue: true,
          startTime: true,
          price: true
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

  if (!booking) {
    throw createError('Booking not found', 404);
  }

  // Check if user owns the booking
  if (booking.userId !== userId) {
    throw createError('Access denied. You can only pay for your own bookings.', 403);
  }

  // Check if booking is in correct status for payment
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
    throw createError('Booking is not eligible for payment', 400);
  }

  // Check if payment already exists
  const existingPayment = await prisma.payment.findFirst({
    where: { bookingId }
  });

  if (existingPayment && existingPayment.status === 'COMPLETED') {
    return res.status(200).json({
      status: 'success',
      message: 'Payment already processed',
      data: { 
        payment: existingPayment,
        booking 
      }
    });
  }

  try {
    // Process payment with external service (simulated)
    const paymentResult = await processPayment(
      Number(booking.totalPrice),
      paymentMethod,
      bookingId
    );

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          bookingId,
          userId,
          amount: booking.totalPrice,
          currency: 'USD',
          paymentMethod,
          transactionId: paymentResult.transactionId,
          status: 'COMPLETED',
          processedAt: paymentResult.processedAt,
          paymentDetails: {
            cardLast4: cardDetails?.cardNumber?.slice(-4) || '****',
            cardType: cardDetails?.cardType || 'unknown'
          }
        } as any
      });

      // Update booking status to CONFIRMED
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CONFIRMED',
          updatedAt: new Date()
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              venue: true,
              startTime: true,
              price: true
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

      return { payment, booking: updatedBooking };
    });

    res.status(201).json({
      status: 'success',
      message: 'Payment processed successfully',
      data: result
    });

  } catch (error: any) {
    // Create failed payment record
    await prisma.payment.create({
      data: {
        bookingId,
        userId,
        amount: booking.totalPrice,
        currency: 'USD',
        paymentMethod,
        status: 'FAILED',
        failureReason: error.message,
        processedAt: new Date()
      } as any
    });

    throw createError(`Payment failed: ${error.message}`, 400);
  }
});

// GET /api/payments/booking/:bookingId - Get payment status for a booking
export const getBookingPaymentStatus = asyncHandler(async (req: any, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    throw createError('User authentication required', 401);
  }

  // Get booking to check ownership
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true }
  });

  if (!booking) {
    throw createError('Booking not found', 404);
  }

  // Check access - user owns booking or is admin
  if (booking.userId !== userId && userRole !== 'ADMIN') {
    throw createError('Access denied', 403);
  }

  // Get payment information
  const payment = await prisma.payment.findFirst({
    where: { bookingId },
    include: {
      booking: {
        select: {
          id: true,
          quantity: true,
          totalPrice: true,
          status: true,
          event: {
            select: {
              name: true,
              venue: true,
              startTime: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!payment) {
    return res.status(200).json({
      status: 'success',
      data: {
        hasPayment: false,
        message: 'No payment found for this booking'
      }
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      hasPayment: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        transactionId: payment.transactionId,
        processedAt: payment.processedAt,
        failureReason: payment.failureReason,
        booking: payment.booking
      }
    }
  });
});

// GET /api/payments/user/:userId - Get user's payment history
export const getUserPayments = asyncHandler(async (req: any, res: Response) => {
  const { userId } = req.params;
  const requestingUserId = req.user?.id;
  const userRole = req.user?.role;

  // Users can only view their own payments unless they're admin
  if (requestingUserId !== userId && userRole !== 'ADMIN') {
    throw createError('Access denied. You can only view your own payments.', 403);
  }

  const payments = await prisma.payment.findMany({
    where: { userId },
    include: {
      booking: {
        select: {
          id: true,
          quantity: true,
          totalPrice: true,
          status: true,
          event: {
            select: {
              id: true,
              name: true,
              venue: true,
              startTime: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    data: {
      payments: payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        transactionId: payment.transactionId,
        processedAt: payment.processedAt,
        failureReason: payment.failureReason,
        booking: payment.booking
      }))
    }
  });
});

// POST /api/payments/refund/:paymentId - Process refund (Admin only)
export const processRefund = asyncHandler(async (req: any, res: Response) => {
  const { paymentId } = req.params;
  const { reason } = req.body;
  const userRole = req.user?.role;

  if (userRole !== 'ADMIN') {
    throw createError('Access denied. Admin privileges required.', 403);
  }

  // Get payment details
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: {
        include: {
          event: {
            select: {
              id: true,
              name: true,
              startTime: true
            }
          }
        }
      }
    }
  });

  if (!payment) {
    throw createError('Payment not found', 404);
  }

  if (payment.status !== 'COMPLETED') {
    throw createError('Only completed payments can be refunded', 400);
  }

  // Check if already refunded
  const existingRefund = await prisma.refund.findFirst({
    where: { paymentId }
  });

  if (existingRefund) {
    throw createError('Payment has already been refunded', 400);
  }

  // Use transaction for refund process
  const result = await prisma.$transaction(async (tx) => {
    // Create refund record
    const refund = await tx.refund.create({
      data: {
        paymentId,
        amount: payment.amount,
        reason: reason || 'Admin initiated refund',
        status: 'COMPLETED',
        processedAt: new Date(),
        refundTransactionId: `rfnd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      } as any
    });

    // Update payment status
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED' }
    });

    // Cancel the booking
    await tx.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'CANCELLED' }
    });

    // Restore event capacity
    await tx.event.update({
      where: { id: payment.booking.eventId },
      data: {
        availableCapacity: {
          increment: payment.booking.quantity
        }
      }
    });

    return refund;
  });

  res.status(200).json({
    status: 'success',
    message: 'Refund processed successfully',
    data: { refund: result }
  });
});
