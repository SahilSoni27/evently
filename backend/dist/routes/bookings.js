"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bookingController_1 = require("../controllers/bookingController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// POST /api/bookings - Create a new booking (Authenticated users)
router.post('/', auth_1.requireAuth, (0, validation_1.validateBody)(schemas_1.createBookingSchema), bookingController_1.createBooking);
// GET /api/bookings/my - Get current user's bookings (convenience endpoint)
router.get('/my', auth_1.requireAuth, (req, res, next) => {
    // Set the userId parameter to current user's ID and call getUserBookings
    req.params.userId = req.user.id;
    (0, bookingController_1.getUserBookings)(req, res, next);
});
// GET /api/bookings/user/:userId - Get user bookings (Own bookings or Admin)
router.get('/user/:userId', auth_1.requireAuth, (0, validation_1.validateParams)(zod_1.z.object({ userId: zod_1.z.string().cuid('Invalid user ID') })), bookingController_1.getUserBookings);
// DELETE /api/bookings/:id - Cancel booking (Own booking or Admin)
router.delete('/:id', auth_1.requireAuth, (0, validation_1.validateParams)(schemas_1.idParamSchema), bookingController_1.cancelBooking);
// GET /api/bookings - Get all bookings (Admin only)
router.get('/', auth_1.requireAuth, auth_1.requireAdmin, bookingController_1.getAllBookings);
exports.default = router;
