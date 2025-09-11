"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// All payment routes require authentication
router.use(auth_1.requireAuth);
// Validation schemas
const processPaymentSchema = zod_1.z.object({
    body: zod_1.z.object({
        bookingId: zod_1.z.string().min(1, 'Booking ID is required'),
        paymentMethod: zod_1.z.enum(['card', 'paypal', 'stripe']),
        cardDetails: zod_1.z.object({
            cardNumber: zod_1.z.string().optional(),
            cardType: zod_1.z.string().optional(),
            expiryMonth: zod_1.z.string().optional(),
            expiryYear: zod_1.z.string().optional(),
            cvv: zod_1.z.string().optional()
        }).optional()
    })
});
const refundSchema = zod_1.z.object({
    body: zod_1.z.object({
        reason: zod_1.z.string().min(1, 'Refund reason is required')
    })
});
// Validation middleware
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse({ body: req.body });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
router.post('/process', validateBody(processPaymentSchema), paymentController_1.processBookingPayment);
// GET /api/payments/booking/:bookingId - Get payment status for a booking
router.get('/booking/:bookingId', paymentController_1.getBookingPaymentStatus);
// GET /api/payments/user/:userId - Get user's payment history
router.get('/user/:userId', paymentController_1.getUserPayments);
// POST /api/payments/refund/:paymentId - Process refund (Admin only)
router.post('/refund/:paymentId', validateBody(refundSchema), paymentController_1.processRefund);
exports.default = router;
