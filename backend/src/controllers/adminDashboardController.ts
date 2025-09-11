import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';

// GET /api/admin/dashboard/overview - Get admin dashboard overview
export const getAdminOverview = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalEvents,
    totalBookings,
    recentBookings,
    totalWaitlists,
    revenueToday
  ] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    prisma.booking.count({
      where: {
        createdAt: { gte: last24Hours },
        status: 'CONFIRMED'
      }
    }),
    prisma.waitlist.count(),
    prisma.booking.aggregate({
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
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', search } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
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
    prisma.user.count({ where })
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
export const getUserDetails = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
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
    prisma.booking.count({ where: { userId } }),
    prisma.waitlist.count({ where: { userId } })
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
