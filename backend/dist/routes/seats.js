"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const seatController_1 = require("../controllers/seatController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// GET /api/seats/event/:eventId - Get all seats for an event
router.get('/event/:eventId', seatController_1.getSeatsForEvent);
// POST /api/seats/book - Book specific seats using queue system
router.post('/book', auth_1.requireAuth, seatController_1.bookSeats);
// GET /api/seats/booking-status/:jobId - Check booking status
router.get('/booking-status/:jobId', auth_1.requireAuth, seatController_1.checkBookingStatus);
// POST /api/seats/generate - Generate seats for an event (Admin only)
router.post('/generate', auth_1.requireAuth, seatController_1.generateSeatsForEvent);
// GET /api/seats/venue/:venueId - Get venue layout
router.get('/venue/:venueId', seatController_1.getVenueLayout);
exports.default = router;
