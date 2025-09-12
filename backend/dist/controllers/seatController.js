"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVenueLayout = exports.generateSeatsForEvent = exports.checkBookingStatus = exports.bookSeats = exports.getSeatsForEvent = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const prisma_1 = __importDefault(require("../lib/prisma"));
const seatBookingQueue_1 = require("../services/seatBookingQueue");
const seatGenerationService_1 = require("../services/seatGenerationService");
// GET /api/seats/event/:eventId - Get all seats for an event with sections
exports.getSeatsForEvent = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { eventId } = req.params;
    // Get event with venue and seats
    const event = await prisma_1.default.event.findUnique({
        where: { id: eventId },
        include: {
            venueDetails: {
                include: {
                    sections: {
                        include: {
                            seats: {
                                include: {
                                    bookings: {
                                        include: {
                                            booking: {
                                                select: {
                                                    id: true,
                                                    status: true,
                                                    userId: true
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
        }
    });
    if (!event) {
        return res.status(404).json({
            status: 'error',
            message: 'Event not found'
        });
    }
    if (!event.venueDetails || !event.venueDetails.sections) {
        return res.status(400).json({
            status: 'error',
            message: 'No venue or seats found for this event'
        });
    }
    // Format sections with seats
    const sections = event.venueDetails.sections.map((section) => ({
        id: section.id,
        name: section.name,
        capacity: section.capacity,
        priceMultiplier: Number(section.priceMultiplier),
        basePrice: Number(event.price),
        sectionPrice: Number(event.price) * Number(section.priceMultiplier),
        seats: section.seats.map((seat) => {
            const confirmedBooking = seat.bookings.find((sb) => sb.booking.status === 'CONFIRMED');
            return {
                id: seat.id,
                row: seat.row,
                number: seat.number,
                seatType: seat.seatType,
                isBlocked: seat.isBlocked,
                isBooked: !!confirmedBooking,
                price: Number(event.price) * Number(section.priceMultiplier)
            };
        })
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
            sections,
            totalAvailableSeats: sections.reduce((total, section) => total + section.seats.filter((seat) => !seat.isBooked && !seat.isBlocked).length, 0)
        }
    });
});
// POST /api/seats/book - Book specific seats using queue system
exports.bookSeats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    try {
        // Add booking job to queue
        const jobId = await (0, seatBookingQueue_1.addSeatBookingJob)({
            userId,
            eventId,
            seatIds,
            idempotencyKey,
            timestamp: Date.now()
        });
        res.json({
            status: 'success',
            message: 'Booking request queued successfully',
            data: {
                jobId,
                checkStatusUrl: `/api/seats/booking-status/${jobId}`
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to queue booking request'
        });
    }
});
// GET /api/seats/booking-status/:jobId - Check booking status
exports.checkBookingStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    try {
        const result = await (0, seatBookingQueue_1.getSeatBookingResult)(jobId);
        if (!result) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking job not found'
            });
        }
        res.json({
            status: 'success',
            data: result
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to check booking status'
        });
    }
});
// POST /api/seats/generate - Generate seats for an event
exports.generateSeatsForEvent = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { eventId, capacity, venueName, seatsPerRow, sectionConfig } = req.body;
    const userId = req.user?.id;
    // Only admins can generate seats
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
            status: 'error',
            message: 'Admin access required'
        });
    }
    if (!eventId || !capacity || !venueName) {
        return res.status(400).json({
            status: 'error',
            message: 'eventId, capacity, and venueName are required'
        });
    }
    try {
        const result = await seatGenerationService_1.SeatGenerationService.generateSeatsForEvent({
            eventId,
            capacity: parseInt(capacity),
            venueName,
            seatsPerRow: seatsPerRow ? parseInt(seatsPerRow) : 10,
            sectionConfig
        });
        res.json({
            status: 'success',
            message: `Generated ${capacity} seats for event`,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to generate seats'
        });
    }
});
// GET /api/seats/venue/:venueId - Get venue layout
exports.getVenueLayout = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { venueId } = req.params;
    const venue = await prisma_1.default.venue.findUnique({
        where: { id: venueId },
        include: {
            sections: {
                include: {
                    seats: {
                        orderBy: [
                            { row: 'asc' },
                            { number: 'asc' }
                        ]
                    }
                },
                orderBy: { name: 'asc' }
            }
        }
    });
    if (!venue) {
        return res.status(404).json({
            status: 'error',
            message: 'Venue not found'
        });
    }
    res.json({
        status: 'success',
        data: venue
    });
});
