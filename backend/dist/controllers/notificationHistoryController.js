"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationStatus = exports.markNotificationAsRead = exports.getUserNotifications = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const pushNotificationService_1 = __importDefault(require("../services/pushNotificationService"));
// GET /api/notifications/user/:userId - Get user's notification history
const getUserNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user?.id;
        const userRole = req.user?.role;
        // Users can only view their own notifications unless they're admin
        if (requestingUserId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. You can only view your own notifications.'
            });
        }
        // Get user's notification history from recent bookings and waitlist activities
        const [bookings, waitlistEntries, pushSubscription] = await Promise.all([
            prisma_1.default.booking.findMany({
                where: { userId },
                include: {
                    event: {
                        select: {
                            id: true,
                            name: true,
                            startTime: true,
                            venue: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            prisma_1.default.waitlist.findMany({
                where: { userId },
                include: {
                    event: {
                        select: {
                            id: true,
                            name: true,
                            startTime: true,
                            venue: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),
            prisma_1.default.pushSubscription.findUnique({
                where: { userId },
                select: { id: true, createdAt: true }
            })
        ]);
        // Create notification timeline
        const notifications = [
            ...bookings.map(booking => ({
                id: `booking-${booking.id}`,
                type: 'booking_confirmation',
                title: '🎫 Booking Confirmed',
                message: `Your booking for "${booking.event.name}" has been confirmed!`,
                eventId: booking.eventId,
                eventName: booking.event.name,
                eventDate: booking.event.startTime,
                venue: booking.event.venue,
                createdAt: booking.createdAt,
                status: booking.status,
                data: {
                    bookingId: booking.id,
                    ticketDownload: `/api/tickets/${booking.id}/download`,
                    ticketQR: `/api/tickets/${booking.id}/qr`
                }
            })),
            ...waitlistEntries.map(entry => ({
                id: `waitlist-${entry.id}`,
                type: entry.status === 'NOTIFIED' ? 'waitlist_promotion' : 'waitlist_joined',
                title: entry.status === 'NOTIFIED' ? '🎉 Spot Available!' : '📝 Waitlist Joined',
                message: entry.status === 'NOTIFIED'
                    ? `A spot opened up for "${entry.event.name}" - book now!`
                    : `You've joined the waitlist for "${entry.event.name}" at position ${entry.position}`,
                eventId: entry.eventId,
                eventName: entry.event.name,
                eventDate: entry.event.startTime,
                venue: entry.event.venue,
                createdAt: entry.createdAt,
                status: entry.status,
                data: {
                    waitlistId: entry.id,
                    position: entry.position,
                    notifiedAt: entry.notifiedAt,
                    expiresAt: entry.expiresAt
                }
            }))
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({
            status: 'success',
            data: {
                notifications,
                pushNotificationsEnabled: !!pushSubscription,
                pushSubscribedAt: pushSubscription?.createdAt,
                totalNotifications: notifications.length
            }
        });
    }
    catch (error) {
        console.error('Get user notifications error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get user notifications'
        });
    }
};
exports.getUserNotifications = getUserNotifications;
// POST /api/notifications/mark-read/:notificationId - Mark notification as read
const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user?.id;
        // For now, we'll just return success since we don't store read status
        // In a production app, you'd have a separate notifications table
        res.json({
            status: 'success',
            message: 'Notification marked as read',
            data: { notificationId }
        });
    }
    catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to mark notification as read'
        });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
// GET /api/notifications/status - Get notification preferences and status
const getNotificationStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                status: 'error',
                message: 'User authentication required'
            });
        }
        const pushSubscription = await prisma_1.default.pushSubscription.findUnique({
            where: { userId }
        });
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true
            }
        });
        res.json({
            status: 'success',
            data: {
                userId,
                email: user?.email,
                name: user?.name,
                pushNotifications: {
                    enabled: !!pushSubscription,
                    subscribedAt: pushSubscription?.createdAt,
                    endpoint: pushSubscription ? '***' : null // Don't expose full endpoint
                },
                emailNotifications: {
                    enabled: true, // Always enabled for now
                    email: user?.email
                },
                vapidPublicKey: pushNotificationService_1.default.getVapidPublicKey()
            }
        });
    }
    catch (error) {
        console.error('Get notification status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get notification status'
        });
    }
};
exports.getNotificationStatus = getNotificationStatus;
