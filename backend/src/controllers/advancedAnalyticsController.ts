import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';

// GET /api/admin/analytics/advanced - Get advanced analytics
export const getAdvancedAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, eventId } = req.query;

  // Date range filter
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate as string);
  if (endDate) dateFilter.lte = new Date(endDate as string);

  // Event filter
  const eventFilter = eventId ? { eventId: eventId as string } : {};

  const [
    mostBookedEvents,
    cancellationRates,
    dailyBookingStats,
    revenueAnalytics,
    userEngagementStats,
    waitlistAnalytics
  ] = await Promise.all([
    // Most booked events
    prisma.$queryRaw`
      SELECT 
        e.id,
        e.name,
        e.venue,
        e.start_time,
        COUNT(b.id) as total_bookings,
        SUM(b.quantity) as total_tickets,
        SUM(b.total_price::numeric) as total_revenue
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id 
        AND b.status = 'CONFIRMED'
        ${Object.keys(dateFilter).length > 0 ? 'AND b.created_at BETWEEN $1 AND $2' : ''}
      ${eventId ? 'WHERE e.id = $' + (Object.keys(dateFilter).length > 0 ? '3' : '1') : ''}
      GROUP BY e.id, e.name, e.venue, e.start_time
      ORDER BY total_bookings DESC
      LIMIT 10
    `,

    // Cancellation rates
    prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_bookings,
        COUNT(*) as total_bookings,
        ROUND(
          COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(*), 0), 2
        ) as cancellation_rate
      FROM bookings b
      ${Object.keys(dateFilter).length > 0 ? 'WHERE b.created_at BETWEEN $1 AND $2' : ''}
      ${eventId ? (Object.keys(dateFilter).length > 0 ? 'AND b.event_id = $3' : 'WHERE b.event_id = $1') : ''}
    `,

    // Daily booking stats
    prisma.$queryRaw`
      SELECT 
        DATE(created_at) as booking_date,
        COUNT(*) as bookings_count,
        SUM(quantity) as tickets_sold,
        SUM(total_price::numeric) as daily_revenue,
        COUNT(DISTINCT user_id) as unique_users
      FROM bookings
      WHERE status = 'CONFIRMED'
        ${Object.keys(dateFilter).length > 0 ? 'AND created_at BETWEEN $1 AND $2' : ''}
        ${eventId ? (Object.keys(dateFilter).length > 0 ? 'AND event_id = $3' : 'AND event_id = $1') : ''}
      GROUP BY DATE(created_at)
      ORDER BY booking_date DESC
      LIMIT 30
    `,

    // Revenue analytics by category
    prisma.$queryRaw`
      SELECT 
        e.category,
        COUNT(b.id) as bookings_count,
        SUM(b.total_price::numeric) as total_revenue,
        AVG(b.total_price::numeric) as avg_booking_value,
        SUM(b.quantity) as tickets_sold
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id AND b.status = 'CONFIRMED'
      ${Object.keys(dateFilter).length > 0 ? 'WHERE b.created_at BETWEEN $1 AND $2' : ''}
      ${eventId ? (Object.keys(dateFilter).length > 0 ? 'AND e.id = $3' : 'WHERE e.id = $1') : ''}
      GROUP BY e.category
      ORDER BY total_revenue DESC
    `,

    // User engagement stats
    prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT b.user_id) as active_users,
        AVG(user_bookings.booking_count) as avg_bookings_per_user,
        MAX(user_bookings.booking_count) as max_bookings_per_user
      FROM (
        SELECT 
          user_id,
          COUNT(*) as booking_count
        FROM bookings
        WHERE status = 'CONFIRMED'
          ${Object.keys(dateFilter).length > 0 ? 'AND created_at BETWEEN $1 AND $2' : ''}
          ${eventId ? (Object.keys(dateFilter).length > 0 ? 'AND event_id = $3' : 'AND event_id = $1') : ''}
        GROUP BY user_id
      ) user_bookings
      CROSS JOIN bookings b
      WHERE b.status = 'CONFIRMED'
        ${Object.keys(dateFilter).length > 0 ? 'AND b.created_at BETWEEN $1 AND $2' : ''}
        ${eventId ? (Object.keys(dateFilter).length > 0 ? 'AND b.event_id = $3' : 'AND b.event_id = $1') : ''}
    `,

    // Waitlist analytics
    prisma.$queryRaw`
      SELECT 
        e.name as event_name,
        COUNT(w.id) as total_waitlist_entries,
        COUNT(CASE WHEN w.status = 'ACTIVE' THEN 1 END) as active_waitlist,
        COUNT(CASE WHEN w.status = 'NOTIFIED' THEN 1 END) as notified_waitlist,
        COUNT(CASE WHEN w.status = 'EXPIRED' THEN 1 END) as expired_waitlist,
        AVG(w.position) as avg_waitlist_position
      FROM waitlist w
      JOIN events e ON w.event_id = e.id
      ${Object.keys(dateFilter).length > 0 ? 'WHERE w.created_at BETWEEN $1 AND $2' : ''}
      ${eventId ? (Object.keys(dateFilter).length > 0 ? 'AND e.id = $3' : 'WHERE e.id = $1') : ''}
      GROUP BY e.id, e.name
      ORDER BY total_waitlist_entries DESC
      LIMIT 10
    `
  ]);

  res.json({
    status: 'success',
    data: {
      mostBookedEvents: (mostBookedEvents as any[]).map((event: any) => ({
        ...event,
        total_revenue: Number(event.total_revenue || 0),
        total_bookings: Number(event.total_bookings || 0),
        total_tickets: Number(event.total_tickets || 0)
      })),
      cancellationRates: {
        confirmed: Number((cancellationRates as any)[0]?.confirmed_bookings || 0),
        cancelled: Number((cancellationRates as any)[0]?.cancelled_bookings || 0),
        total: Number((cancellationRates as any)[0]?.total_bookings || 0),
        cancellationRate: Number((cancellationRates as any)[0]?.cancellation_rate || 0)
      },
      dailyStats: (dailyBookingStats as any[]).map((stat: any) => ({
        date: stat.booking_date,
        bookings: Number(stat.bookings_count),
        tickets: Number(stat.tickets_sold),
        revenue: Number(stat.daily_revenue || 0),
        uniqueUsers: Number(stat.unique_users)
      })),
      revenueByCategory: (revenueAnalytics as any[]).map((category: any) => ({
        category: category.category,
        bookings: Number(category.bookings_count || 0),
        revenue: Number(category.total_revenue || 0),
        avgBookingValue: Number(category.avg_booking_value || 0),
        ticketsSold: Number(category.tickets_sold || 0)
      })),
      userEngagement: {
        activeUsers: Number((userEngagementStats as any)[0]?.active_users || 0),
        avgBookingsPerUser: Number((userEngagementStats as any)[0]?.avg_bookings_per_user || 0),
        maxBookingsPerUser: Number((userEngagementStats as any)[0]?.max_bookings_per_user || 0)
      },
      waitlistAnalytics: (waitlistAnalytics as any[]).map((waitlist: any) => ({
        eventName: waitlist.event_name,
        totalEntries: Number(waitlist.total_waitlist_entries || 0),
        active: Number(waitlist.active_waitlist || 0),
        notified: Number(waitlist.notified_waitlist || 0),
        expired: Number(waitlist.expired_waitlist || 0),
        avgPosition: Number(waitlist.avg_waitlist_position || 0)
      }))
    }
  });
});

// GET /api/admin/analytics/conversion-funnel - Get booking conversion funnel
export const getConversionFunnel = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate as string);
  if (endDate) dateFilter.lte = new Date(endDate as string);

  // This is a simplified funnel - in a real app you'd track page views, etc.
  const [
    eventViews, // We'll use total events as proxy
    waitlistJoins,
    bookingAttempts,
    successfulBookings
  ] = await Promise.all([
    prisma.event.count(),
    prisma.waitlist.count({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    }),
    prisma.booking.count({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    }),
    prisma.booking.count({
      where: {
        status: 'CONFIRMED',
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    })
  ]);

  const funnel = [
    { stage: 'Event Views', count: eventViews, percentage: 100 },
    { stage: 'Waitlist Joins', count: waitlistJoins, percentage: Math.round((waitlistJoins / eventViews) * 100) },
    { stage: 'Booking Attempts', count: bookingAttempts, percentage: Math.round((bookingAttempts / eventViews) * 100) },
    { stage: 'Successful Bookings', count: successfulBookings, percentage: Math.round((successfulBookings / eventViews) * 100) }
  ];

  res.json({
    status: 'success',
    data: {
      funnel,
      conversionRate: Math.round((successfulBookings / eventViews) * 100),
      totalSteps: funnel.length
    }
  });
});

// GET /api/admin/analytics/real-time - Get real-time statistics
export const getRealTimeStats = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

  const [
    bookingsLast24h,
    bookingsLastHour,
    waitlistLast24h,
    activeUsers,
    upcomingEvents
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        createdAt: { gte: last24Hours },
        status: 'CONFIRMED'
      }
    }),
    prisma.booking.count({
      where: {
        createdAt: { gte: lastHour },
        status: 'CONFIRMED'
      }
    }),
    prisma.waitlist.count({
      where: {
        createdAt: { gte: last24Hours }
      }
    }),
    prisma.booking.findMany({
      where: {
        createdAt: { gte: lastHour }
      },
      select: { userId: true },
      distinct: ['userId']
    }),
    prisma.event.count({
      where: {
        startTime: { gte: now }
      }
    })
  ]);

  res.json({
    status: 'success',
    data: {
      bookings: {
        last24Hours: bookingsLast24h,
        lastHour: bookingsLastHour
      },
      waitlist: {
        last24Hours: waitlistLast24h
      },
      activeUsers: activeUsers.length,
      upcomingEvents,
      timestamp: now.toISOString()
    }
  });
});
