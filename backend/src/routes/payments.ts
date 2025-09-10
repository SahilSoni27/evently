import { Router } from 'express';
import {
  processBookingPayment,
  getBookingPaymentStatus,
  getUserPayments,
  processRefund
} from '../controllers/paymentController';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// All payment routes require authentication
router.use(requireAuth);

// Validation schemas
const processPaymentSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
    paymentMethod: z.enum(['card', 'paypal', 'stripe']),
    cardDetails: z.object({
      cardNumber: z.string().optional(),
      cardType: z.string().optional(),
      expiryMonth: z.string().optional(),
      expiryYear: z.string().optional(),
      cvv: z.string().optional()
    }).optional()
  })
});

const refundSchema = z.object({
  body: z.object({
    reason: z.string().min(1, 'Refund reason is required')
  })
});

// Validation middleware
const validateBody = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse({ body: req.body });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: error.issues
        });
      }
      next(error);
    }
  };
};

// POST /api/payments/process - Process payment for a booking
router.post('/process', validateBody(processPaymentSchema), processBookingPayment);

// GET /api/payments/booking/:bookingId - Get payment status for a booking
router.get('/booking/:bookingId', getBookingPaymentStatus);

// GET /api/payments/user/:userId - Get user's payment history
router.get('/user/:userId', getUserPayments);

// POST /api/payments/refund/:paymentId - Process refund (Admin only)
router.post('/refund/:paymentId', validateBody(refundSchema), processRefund);

export default router;
