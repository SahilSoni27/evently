"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDetails = exports.getAllUsers = exports.getAdminOverview = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
// GET /api/admin/dashboard/overview - Get admin dashboard overview
exports.getAdminOverview = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [totalUsers, totalEvents, totalBookings, recentBookings, totalWaitlists, revenueToday] = await Promise.all([
        prisma_1.default.user.count(),
        prisma_1.default.event.count(),
        prisma_1.default.booking.count({ where: { status: 'CONFIRMED' } }),
        prisma_1.default.booking.count({
            where: {
                createdAt: { gte: last24Hours },
                status: 'CONFIRMED'
            }
        }),
        prisma_1.default.waitlist.count(),
        prisma_1.default.booking.aggregate({
            where: {
                createdAt: { gte: last24Hours },
                status: 'CONFIRMED'
            },
            _sum: { totalPrice: true }
        })
    ]);
    res.json({
        status: 'success',
        message: '🎉 Admin Dashboard Overview Retrieved!',
        data: {
            overview: {
                totalUsers,
                totalEvents,
                totalBookings,
                recentBookings,
                totalWaitlists,
                revenueToday: Number(revenueToday._sum.totalPrice || 0)
            },
            toast: {
                title: "Admin Dashboard",
                message: "Overview data loaded successfully",
                type: "success",
                duration: 3000
            }
        }
    });
});
// GET /api/admin/users - Get all users with basic info
exports.getAllUsers = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = '1', limit = '20', search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const where = {};
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
        ];
    }
    const [users, total] = await Promise.all([
        prisma_1.default.user.findMany({
            where,
            take: limitNum,
            skip: offset,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma_1.default.user.count({ where })
    ]);
    res.json({
        status: 'success',
        message: '👥 User List Retrieved!',
        data: {
            users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasMore: offset + users.length < total
            },
            toast: {
                title: "Users Loaded",
                message: `Found ${users.length} users`,
                type: "info",
                duration: 2000
            }
        }
    });
});
// GET /api/admin/users/:userId/details - Get detailed user info
exports.getUserDetails = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
        }
    });
    if (!user) {
        return res.status(404).json({
            status: 'error',
            message: 'User not found',
            toast: {
                title: "User Not Found",
                message: "The requested user could not be found",
                type: "error",
                duration: 4000
            }
        });
    }
    // Get user's booking and waitlist counts
    const [bookingCount, waitlistCount] = await Promise.all([
        prisma_1.default.booking.count({ where: { userId } }),
        prisma_1.default.waitlist.count({ where: { userId } })
    ]);
    res.json({
        status: 'success',
        message: `📋 Details for ${user.name || user.email}`,
        data: {
            user,
            stats: {
                totalBookings: bookingCount,
                totalWaitlists: waitlistCount
            },
            toast: {
                title: "User Details",
                message: `Loaded details for ${user.name || user.email}`,
                type: "success",
                duration: 3000
            }
        }
    });
});
