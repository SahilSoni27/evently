"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventStats = exports.deleteEvent = exports.updateEvent = exports.createEvent = exports.getEventById = exports.getEvents = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
// GET /api/events - List all events with pagination and search
exports.getEvents = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Extract and parse query parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || undefined;
    const sortBy = req.query.sortBy || 'startTime';
    const sortOrder = req.query.sortOrder || 'asc';
    // Build where clause for search
    const where = search ? {
        OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { venue: { contains: search, mode: 'insensitive' } }
        ]
    } : {};
    // Calculate pagination
    const skip = (page - 1) * limit;
    // Build orderBy clause
    const orderBy = { [sortBy]: sortOrder };
    // Get events with pagination
    const [events, totalCount] = await Promise.all([
        prisma_1.default.event.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            select: {
                id: true,
                name: true,
                description: true,
                venue: true,
                startTime: true,
                endTime: true,
                capacity: true,
                availableCapacity: true,
                price: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { bookings: true }
                }
            }
        }),
        prisma_1.default.event.count({ where })
    ]);
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    res.status(200).json({
        status: 'success',
        data: {
            events,
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
// GET /api/events/:id - Get single event details
exports.getEventById = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const event = await prisma_1.default.event.findUnique({
        where: { id },
        include: {
            bookings: {
                select: {
                    id: true,
                    quantity: true,
                    status: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            },
            waitlist: {
                select: {
                    id: true,
                    position: true,
                    status: true,
                    userId: true,
                    createdAt: true
                },
                orderBy: { position: 'asc' }
            },
            _count: {
                select: {
                    bookings: true,
                    waitlist: true
                }
            }
        }
    });
    if (!event) {
        throw (0, errorHandler_1.createError)('Event not found', 404);
    }
    // Check user's booking status
    let userBooking = null;
    let userWaitlistPosition = null;
    let canJoinWaitlist = false;
    if (userId) {
        // Check if user has existing booking
        userBooking = event.bookings.find(booking => booking.user.id === userId);
        // Check if user is on waitlist
        const userWaitlistEntry = event.waitlist.find(entry => entry.userId === userId);
        if (userWaitlistEntry) {
            userWaitlistPosition = userWaitlistEntry.position;
        }
        // User can join waitlist if:
        // - Event is full (availableCapacity = 0)
        // - User doesn't have a booking
        // - User is not already on waitlist
        // - Event is in the future
        canJoinWaitlist = event.availableCapacity === 0 &&
            !userBooking &&
            !userWaitlistEntry &&
            event.startTime > new Date();
    }
    const responseData = {
        event: {
            ...event,
            // Remove detailed user info from bookings for privacy
            bookings: event.bookings.map(booking => ({
                id: booking.id,
                quantity: booking.quantity,
                status: booking.status,
                createdAt: booking.createdAt
            }))
        },
        userStatus: userId ? {
            hasBooking: !!userBooking,
            bookingId: userBooking?.id,
            waitlistPosition: userWaitlistPosition,
            canJoinWaitlist,
            canBook: event.availableCapacity > 0 && !userBooking && event.startTime > new Date()
        } : null,
        availability: {
            isFull: event.availableCapacity === 0,
            available: event.availableCapacity,
            total: event.capacity,
            waitlistCount: event._count.waitlist,
            bookingsCount: event._count.bookings
        }
    };
    res.status(200).json({
        status: 'success',
        data: responseData
    });
});
// POST /api/events - Create new event (Admin only)
exports.createEvent = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const eventData = req.body;
    // Check if user is admin (middleware should handle this, but double-check)
    if (req.user?.role !== 'ADMIN') {
        throw (0, errorHandler_1.createError)('Access denied. Admin privileges required.', 403);
    }
    // Convert date strings to Date objects
    const startTime = new Date(eventData.startTime);
    const endTime = eventData.endTime ? new Date(eventData.endTime) : null;
    // Validate dates
    if (startTime < new Date()) {
        throw (0, errorHandler_1.createError)('Event start time cannot be in the past', 400);
    }
    if (endTime && endTime <= startTime) {
        throw (0, errorHandler_1.createError)('Event end time must be after start time', 400);
    }
    const event = await prisma_1.default.event.create({
        data: {
            name: eventData.name,
            description: eventData.description,
            venue: eventData.venue,
            startTime,
            endTime,
            capacity: eventData.capacity,
            availableCapacity: eventData.capacity, // Initially same as capacity
            price: eventData.price || 0,
            category: eventData.category || 'OTHER',
            tags: eventData.tags || [],
            imageUrl: eventData.imageUrl
        },
        select: {
            id: true,
            name: true,
            description: true,
            venue: true,
            startTime: true,
            endTime: true,
            capacity: true,
            availableCapacity: true,
            price: true,
            category: true,
            tags: true,
            imageUrl: true,
            createdAt: true,
            updatedAt: true
        }
    });
    res.status(201).json({
        status: 'success',
        message: 'Event created successfully',
        data: { event }
    });
});
// PUT /api/events/:id - Update event (Admin only)
exports.updateEvent = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
        throw (0, errorHandler_1.createError)('Access denied. Admin privileges required.', 403);
    }
    // Check if event exists
    const existingEvent = await prisma_1.default.event.findUnique({
        where: { id },
        select: { id: true, capacity: true, availableCapacity: true }
    });
    if (!existingEvent) {
        throw (0, errorHandler_1.createError)('Event not found', 404);
    }
    // Prepare update data
    const updatePayload = {};
    if (updateData.name)
        updatePayload.name = updateData.name;
    if (updateData.description !== undefined)
        updatePayload.description = updateData.description;
    if (updateData.venue)
        updatePayload.venue = updateData.venue;
    if (updateData.price !== undefined)
        updatePayload.price = updateData.price;
    // Handle date updates
    if (updateData.startTime) {
        const startTime = new Date(updateData.startTime);
        if (startTime < new Date()) {
            throw (0, errorHandler_1.createError)('Event start time cannot be in the past', 400);
        }
        updatePayload.startTime = startTime;
    }
    if (updateData.endTime) {
        const endTime = new Date(updateData.endTime);
        updatePayload.endTime = endTime;
    }
    // Handle capacity updates carefully
    if (updateData.capacity !== undefined) {
        const bookedTickets = existingEvent.capacity - existingEvent.availableCapacity;
        if (updateData.capacity < bookedTickets) {
            throw (0, errorHandler_1.createError)(`Cannot reduce capacity below ${bookedTickets} (number of booked tickets)`, 400);
        }
        updatePayload.capacity = updateData.capacity;
        updatePayload.availableCapacity = updateData.capacity - bookedTickets;
    }
    const updatedEvent = await prisma_1.default.event.update({
        where: { id },
        data: updatePayload,
        select: {
            id: true,
            name: true,
            description: true,
            venue: true,
            startTime: true,
            endTime: true,
            capacity: true,
            availableCapacity: true,
            price: true,
            updatedAt: true
        }
    });
    res.status(200).json({
        status: 'success',
        message: 'Event updated successfully',
        data: { event: updatedEvent }
    });
});
// DELETE /api/events/:id - Delete event (Admin only)
exports.deleteEvent = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
        throw (0, errorHandler_1.createError)('Access denied. Admin privileges required.', 403);
    }
    // Check if event exists and has bookings
    const event = await prisma_1.default.event.findUnique({
        where: { id },
        include: {
            _count: {
                select: { bookings: true }
            }
        }
    });
    if (!event) {
        throw (0, errorHandler_1.createError)('Event not found', 404);
    }
    // Don't allow deletion if there are active bookings
    if (event._count.bookings > 0) {
        throw (0, errorHandler_1.createError)('Cannot delete event with existing bookings. Cancel all bookings first.', 400);
    }
    await prisma_1.default.event.delete({
        where: { id }
    });
    res.status(200).json({
        status: 'success',
        message: 'Event deleted successfully'
    });
});
// GET /api/events/stats - Get event statistics (Admin only)
exports.getEventStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
        throw (0, errorHandler_1.createError)('Access denied. Admin privileges required.', 403);
    }
    const [totalEvents, upcomingEvents, pastEvents, totalBookings, totalRevenue] = await Promise.all([
        prisma_1.default.event.count(),
        prisma_1.default.event.count({
            where: { startTime: { gt: new Date() } }
        }),
        prisma_1.default.event.count({
            where: { startTime: { lt: new Date() } }
        }),
        prisma_1.default.booking.count({
            where: { status: 'CONFIRMED' }
        }),
        prisma_1.default.booking.aggregate({
            where: { status: 'CONFIRMED' },
            _sum: { totalPrice: true }
        })
    ]);
    // Get most popular events
    const popularEvents = await prisma_1.default.event.findMany({
        take: 5,
        orderBy: {
            bookings: { _count: 'desc' }
        },
        select: {
            id: true,
            name: true,
            venue: true,
            startTime: true,
            _count: {
                select: { bookings: true }
            }
        }
    });
    res.status(200).json({
        status: 'success',
        data: {
            overview: {
                totalEvents,
                upcomingEvents,
                pastEvents,
                totalBookings,
                totalRevenue: totalRevenue._sum.totalPrice || 0
            },
            popularEvents
        }
    });
});
