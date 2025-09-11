"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllBookings = exports.cancelBooking = exports.getUserBookings = exports.createBooking = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const retry_1 = require("../utils/retry");
const analyticsCache_1 = __importDefault(require("../utils/analyticsCache"));
const jobQueue_1 = __importDefault(require("../services/jobQueue"));
// POST /api/bookings - Create a new booking with optimistic locking
exports.createBooking = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const bookingData = req.body;
    const userId = req.user?.id;
    if (!userId) {
        throw (0, errorHandler_1.createError)('User authentication required', 401);
    }
    // Generate idempotency key if not provided
    if (!bookingData.idempotencyKey) {
        bookingData.idempotencyKey = (0, retry_1.generateIdempotencyKey)(userId, bookingData.eventId);
    }
    // Use optimistic locking with retry logic
    const result = await (0, retry_1.withOptimisticLocking)(async () => {
        // Check if event exists and get current state with version
        const event = await prisma_1.default.event.findUnique({
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
            throw (0, errorHandler_1.createError)('Event not found', 404);
        }
        // Check if event is in the future
        if (event.startTime < new Date()) {
            throw (0, errorHandler_1.createError)('Cannot book tickets for past events', 400);
        }
        // Check if sufficient capacity is available
        if (event.availableCapacity < bookingData.quantity) {
            throw (0, errorHandler_1.createError)(`Only ${event.availableCapacity} tickets available, requested ${bookingData.quantity}`, 400);
        }
        // Check for duplicate booking if idempotencyKey is provided
        const existingBooking = await prisma_1.default.booking.findFirst({
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
        const booking = await prisma_1.default.$transaction(async (tx) => {
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
                    throw (0, errorHandler_1.createError)('Event not found', 404);
                }
                if (currentEvent.version !== event.version) {
                    throw (0, errorHandler_1.createError)('Event capacity changed, please retry', 409);
                }
                if (currentEvent.availableCapacity < bookingData.quantity) {
                    throw (0, errorHandler_1.createError)(`Only ${currentEvent.availableCapacity} tickets available, requested ${bookingData.quantity}`, 400);
                }
                // This should not happen, but just in case
                throw (0, errorHandler_1.createError)('Failed to update event capacity', 500);
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
        analyticsCache_1.default.invalidateEventCache(bookingData.eventId).catch(err => console.error('Failed to invalidate analytics cache:', err));
        // Schedule background jobs
        try {
            // Send booking confirmation email
            await jobQueue_1.default.scheduleBookingConfirmation({
                type: 'booking_confirmation',
                to: result.booking.user.email,
                eventId: result.booking.event.id,
                bookingId: result.booking.id,
                eventName: result.booking.event.name,
                userName: result.booking.user.name || 'Guest',
                eventStartTime: result.booking.event.startTime,
                venue: result.booking.event.venue,
            });
            // Schedule event reminder (24 hours before event)
            const reminderTime = new Date(result.booking.event.startTime);
            reminderTime.setHours(reminderTime.getHours() - 24);
            if (reminderTime > new Date()) {
                await jobQueue_1.default.scheduleEventReminder({
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
            await jobQueue_1.default.scheduleAnalyticsUpdate({
                type: 'update_event_stats',
                eventId: result.booking.event.id,
            });
            // Generate QR code and PDF ticket data for the booking
            // This is done in background so we don't slow down the booking response
            setTimeout(() => {
                Promise.resolve().then(() => __importStar(require('../services/ticketService'))).then(({ TicketService }) => {
                    TicketService.generateQRCode(result.booking.id).catch(err => console.error('Failed to generate QR code for booking:', result.booking.id, err));
                });
            }, 100);
            // Send push notification for booking confirmation
            setTimeout(() => {
                Promise.resolve().then(() => __importStar(require('../services/pushNotificationService'))).then(({ default: PushService }) => {
                    PushService.sendBookingConfirmation(result.booking.id).catch(err => console.error('Failed to send booking confirmation push notification:', result.booking.id, err));
                });
            }, 200);
        }
        catch (jobError) {
            console.error('Failed to schedule background jobs:', jobError);
            // Don't fail the booking creation if job scheduling fails
        }
    }
    // Add ticket links to successful booking responses
    const response = {
        status: 'success',
        message,
        data: {
            booking: result.booking,
            ...(result.isNew && {
                ticketLinks: {
                    download: `/api/tickets/${result.booking.id}/download`,
                    qrCode: `/api/tickets/${result.booking.id}/qr`,
                    details: `/api/tickets/${result.booking.id}/details`
                }
            })
        }
    };
    res.status(statusCode).json(response);
});
// GET /api/bookings/user/:userId - Get user bookings
exports.getUserBookings = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    const userRole = req.user?.role;
    // Users can only view their own bookings unless they're admin
    if (requestingUserId !== userId && userRole !== 'ADMIN') {
        throw (0, errorHandler_1.createError)('Access denied. You can only view your own bookings.', 403);
    }
    // Check if user exists
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true }
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('User not found', 404);
    }
    // Get user's bookings with event details
    const bookings = await prisma_1.default.booking.findMany({
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
    res.status(200).json({
        status: 'success',
        data: {
            user,
            bookings
        }
    });
});
// DELETE /api/bookings/:id - Cancel booking with optimistic locking
exports.cancelBooking = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) {
        throw (0, errorHandler_1.createError)('User authentication required', 401);
    }
    // Use optimistic locking with retry logic
    await (0, retry_1.withOptimisticLocking)(async () => {
        // Get booking with event details including version
        const booking = await prisma_1.default.booking.findUnique({
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
            throw (0, errorHandler_1.createError)('Booking not found', 404);
        }
        // Check if user owns the booking or is admin
        if (booking.userId !== userId && userRole !== 'ADMIN') {
            throw (0, errorHandler_1.createError)('Access denied. You can only cancel your own bookings.', 403);
        }
        // Check if booking is already cancelled
        if (booking.status === 'CANCELLED') {
            throw (0, errorHandler_1.createError)('Booking is already cancelled', 400);
        }
        // Check if event has already started (allow cancellation up to event start time)
        if (booking.event.startTime <= new Date()) {
            throw (0, errorHandler_1.createError)('Cannot cancel booking for events that have already started', 400);
        }
        // Use transaction with optimistic locking
        await prisma_1.default.$transaction(async (tx) => {
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
                throw (0, errorHandler_1.createError)('Event capacity changed, please retry', 409);
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
exports.getAllBookings = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN') {
        throw (0, errorHandler_1.createError)('Access denied. Admin privileges required.', 403);
    }
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const status = req.query.status;
    // Build where clause
    const where = status ? { status: status } : {};
    // Calculate pagination
    const skip = (page - 1) * limit;
    // Get bookings with pagination
    const [bookings, totalCount] = await Promise.all([
        prisma_1.default.booking.findMany({
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
        prisma_1.default.booking.count({ where })
    ]);
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    res.status(200).json({
        status: 'success',
        data: {
            bookings,
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
