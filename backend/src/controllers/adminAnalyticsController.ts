import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import AnalyticsCache from '../utils/analyticsCache';

// GET /api/admin/analytics/overview - Get overview statistics
export const getOverviewStats = asyncHandler(async (req: Request, res: Response) => {
  const { data: stats, cached } = await AnalyticsCache.getOrSet(
    'overview',
    async () => {
      const [
        totalEvents,
        totalBookings,
        totalUsers,
        activeEvents,
        upcomingEvents
      ] = await Promise.all([
        // Total events created
        prisma.event.count(),
        
        // Total bookings (excluding cancelled)
        prisma.booking.count(),
        
        // Total registered users
        prisma.user.count(),
        
        // Active events (happening now)
        prisma.event.count({
          where: {
            startTime: { lte: new Date() },
            endTime: { gte: new Date() }
          } as any
        }),
        
        // Upcoming events
        prisma.event.count({
          where: {
            startTime: { gt: new Date() }
          } as any
        })
      ]);

      return {
        totalEvents,
        totalBookings,
        totalUsers,
        activeEvents,
        upcomingEvents
      };
    },
    { ttl: 300 } // 5 minutes
  );

  res.json({
    status: 'success',
    data: { stats },
    cached
  });
});

// GET /api/admin/analytics/events - Get event analytics
export const getEventAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { timeframe = '30d', limit = '10' } = req.query;
  
  const cacheKey = `events:${timeframe}:${limit}`;
  
  const { data: result, cached } = await AnalyticsCache.getOrSet(
    cacheKey,
    async () => {
      // Calculate date range
      const daysBack = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get events with booking counts
      const events = await prisma.event.findMany({
        select: {
          id: true,
          name: true,
          venue: true,
          startTime: true,
          capacity: true,
          price: true,
          _count: {
            select: {
              bookings: true
            }
          }
        },
        where: {
          createdAt: { gte: startDate }
        },
        take: parseInt(limit as string),
        orderBy: {
          createdAt: 'desc'
        }
      });

      const eventAnalytics = events.map(event => {
        return {
          id: event.id,
          name: event.name,
          venue: event.venue,
          startTime: event.startTime,
          price: event.price,
          capacity: event.capacity,
          totalBookings: event._count.bookings
        };
      });

      return {
        events: eventAnalytics,
        timeframe,
        totalEvents: eventAnalytics.length
      };
    },
    { ttl: 600 } // 10 minutes
  );

  res.json({
    status: 'success',
    data: result,
    cached
  });
});

// GET /api/admin/analytics/bookings - Get booking analytics
export const getBookingAnalytics = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const daysBack = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get recent bookings
    const recentBookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
      include: {
        event: {
          select: {
            name: true,
            venue: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Simple daily aggregation
    const dailyStats = new Map<string, { date: string; bookings: number }>();
    
    recentBookings.forEach(booking => {
      const date = booking.createdAt.toISOString().split('T')[0];
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { date, bookings: 0 });
      }
      const stats = dailyStats.get(date)!;
      stats.bookings += 1;
    });

    res.json({
      status: 'success',
      data: {
        dailyTrends: Array.from(dailyStats.values()).sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()),
        recentBookings: recentBookings.slice(0, 20), // Latest 20 bookings
        timeframe,
        totalBookings: recentBookings.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch booking analytics'
    });
  }
});

// GET /api/admin/analytics/users - Get user analytics
export const getUserAnalytics = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const daysBack = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get recent user registrations
    const recentUsers = await prisma.user.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Get users with booking activity
    const activeUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        bookings: {
          select: {
            id: true,
            quantity: true,
            totalPrice: true
          }
        }
      },
      where: {
        bookings: {
          some: {
            createdAt: { gte: startDate }
          }
        }
      },
      take: 20
    });

    // Calculate user metrics
    const userMetrics = activeUsers.map(user => {
      const totalBookings = user.bookings.length;
      const totalSpent = user.bookings.reduce((sum, booking) => 
        sum + Number(booking.totalPrice), 0);
      const totalTickets = user.bookings.reduce((sum, booking) => 
        sum + booking.quantity, 0);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        totalBookings,
        totalSpent,
        totalTickets
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    res.json({
      status: 'success',
      data: {
        topUsers: userMetrics,
        recentRegistrations: recentUsers,
        timeframe
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user analytics'
    });
  }
});

// GET /api/admin/analytics/revenue - Get revenue analytics
export const getRevenueAnalytics = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const daysBack = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get bookings with revenue data
    const revenueBookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      select: {
        totalPrice: true,
        quantity: true,
        createdAt: true,
        event: {
          select: {
            name: true,
            venue: true,
            price: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate daily revenue
    const dailyRevenue = new Map<string, { date: string; revenue: number; bookings: number }>();
    let totalRevenue = 0;

    revenueBookings.forEach(booking => {
      const date = booking.createdAt.toISOString().split('T')[0];
      const revenue = Number(booking.totalPrice);
      totalRevenue += revenue;

      if (!dailyRevenue.has(date)) {
        dailyRevenue.set(date, { date, revenue: 0, bookings: 0 });
      }
      const stats = dailyRevenue.get(date)!;
      stats.revenue += revenue;
      stats.bookings += 1;
    });

    // Revenue by venue
    const venueRevenue = new Map<string, number>();
    revenueBookings.forEach(booking => {
      const venue = booking.event.venue;
      const revenue = Number(booking.totalPrice);
      
      if (!venueRevenue.has(venue)) {
        venueRevenue.set(venue, 0);
      }
      venueRevenue.set(venue, venueRevenue.get(venue)! + revenue);
    });

    res.json({
      status: 'success',
      data: {
        dailyRevenue: Array.from(dailyRevenue.values()).sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()),
        revenueByVenue: Array.from(venueRevenue.entries()).map(([venue, revenue]) => ({
          venue,
          revenue
        })).sort((a, b) => b.revenue - a.revenue),
        timeframe,
        totalRevenue,
        totalBookings: revenueBookings.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch revenue analytics'
    });
  }
});
