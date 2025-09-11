import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// GET /api/search - Search events
export const searchEvents = async (req: Request, res: Response) => {
  try {
    const {
      query = '',
      venue,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      availableOnly = 'false',
      sortBy = 'startTime',
      sortOrder = 'asc',
      limit = '20',
      offset = '0'
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = parseInt(offset as string) || 0;

    // Build where clause
    const where: any = {};

    // Text search across name, description, and venue
    if (query && typeof query === 'string' && query.trim()) {
      const searchTerm = query.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { venue: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Venue filter
    if (venue && typeof venue === 'string') {
      where.venue = { contains: venue, mode: 'insensitive' };
    }

    // Price range filter
    const minPriceNum = minPrice ? parseFloat(minPrice as string) : undefined;
    const maxPriceNum = maxPrice ? parseFloat(maxPrice as string) : undefined;
    if (minPriceNum !== undefined || maxPriceNum !== undefined) {
      where.price = {};
      if (minPriceNum !== undefined) where.price.gte = minPriceNum;
      if (maxPriceNum !== undefined) where.price.lte = maxPriceNum;
    }

    // Date range filter
    const startDateObj = startDate ? new Date(startDate as string) : undefined;
    const endDateObj = endDate ? new Date(endDate as string) : undefined;
    if (startDateObj || endDateObj) {
      where.startTime = {};
      if (startDateObj) where.startTime.gte = startDateObj;
      if (endDateObj) where.startTime.lte = endDateObj;
    }

    // Available capacity filter
    if (availableOnly === 'true') {
      where.availableCapacity = { gt: 0 };
    }

    // Build order by clause
    const orderBy: any = {};
    const validSortFields = ['startTime', 'price', 'capacity', 'name', 'createdAt'];
    if (validSortFields.includes(sortBy as string)) {
      orderBy[sortBy as string] = sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.startTime = 'asc';
    }

    // Execute search query
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        take: limitNum,
        skip: offsetNum
      }),
      prisma.event.count({ where })
    ]);

    // Get filter information
    const [venues, priceStats] = await Promise.all([
      prisma.event.findMany({
        select: { venue: true },
        distinct: ['venue'],
        take: 20
      }).then(results => results.map(r => r.venue)),
      prisma.event.aggregate({
        _min: { price: true },
        _max: { price: true }
      })
    ]);

    res.json({
      status: 'success',
      data: {
        events: events.map(event => ({
          ...event,
          price: Number(event.price) // Convert Decimal to number
        })),
        total,
        hasMore: offsetNum + events.length < total,
        filters: {
          venues: venues.slice(0, 10),
          priceRange: {
            min: Number(priceStats._min.price) || 0,
            max: Number(priceStats._max.price) || 0
          }
        }
      }
    });

  } catch (error) {
    console.error('Search events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search events'
    });
  }
};

// GET /api/search/suggestions - Get search suggestions
export const getSearchSuggestions = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.length < 2) {
      return res.json({
        status: 'success',
        data: { suggestions: [] }
      });
    }

    const suggestions = await prisma.event.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { venue: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        name: true,
        venue: true
      },
      take: 10
    });

    const suggestionSet = new Set<string>();

    suggestions.forEach(event => {
      // Add event names that match
      if (event.name.toLowerCase().includes(query.toLowerCase())) {
        suggestionSet.add(event.name);
      }
      
      // Add venues that match
      if (event.venue.toLowerCase().includes(query.toLowerCase())) {
        suggestionSet.add(event.venue);
      }
    });

    res.json({
      status: 'success',
      data: {
        suggestions: Array.from(suggestionSet).slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get search suggestions'
    });
  }
};

// GET /api/search/popular - Get popular search terms
export const getPopularSearches = async (req: Request, res: Response) => {
  try {
    // Get most common venues as popular searches
    const venues = await prisma.$queryRaw<{ venue: string; count: bigint }[]>`
      SELECT venue, COUNT(*) as count
      FROM events
      GROUP BY venue
      ORDER BY count DESC
      LIMIT 8
    `;

    const popularSearches = venues.map(v => v.venue);

    res.json({
      status: 'success',
      data: {
        searches: popularSearches
      }
    });

  } catch (error) {
    console.error('Get popular searches error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get popular searches'
    });
  }
};

// GET /api/search/upcoming - Get upcoming events
export const getUpcomingEvents = async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);

    const events = await prisma.event.findMany({
      where: {
        startTime: {
          gte: new Date()
        },
        availableCapacity: {
          gt: 0
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: limitNum
    });

    res.json({
      status: 'success',
      data: {
        events: events.map(event => ({
          ...event,
          price: Number(event.price)
        }))
      }
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get upcoming events'
    });
  }
};

// GET /api/search/similar/:eventId - Get similar events
export const getSimilarEvents = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { limit = '5' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 5, 20);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        venue: true,
        price: true
      }
    });

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    // Find similar events based on venue and price
    const similarEvents = await prisma.event.findMany({
      where: {
        AND: [
          { id: { not: eventId } }, // Exclude the current event
          {
            OR: [
              { venue: event.venue },
              {
                price: {
                  gte: Number(event.price) * 0.5, // 50% lower
                  lte: Number(event.price) * 1.5  // 50% higher
                }
              }
            ]
          }
        ]
      },
      take: limitNum,
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json({
      status: 'success',
      data: {
        events: similarEvents.map(evt => ({
          ...evt,
          price: Number(evt.price)
        }))
      }
    });

  } catch (error) {
    console.error('Get similar events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get similar events'
    });
  }
};
