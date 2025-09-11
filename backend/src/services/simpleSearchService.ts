import prisma from '../lib/prisma';
import { EventCategory } from '../types';

interface SearchFilters {
  query?: string;
  category?: EventCategory;
  venue?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: Date;
  endDate?: Date;
  availableOnly?: boolean;
  sortBy?: 'startTime' | 'price' | 'capacity' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface SearchResult {
  events: any[];
  total: number;
  hasMore: boolean;
  categories: { category: EventCategory; count: number }[];
  venues: { venue: string; count: number }[];
  priceRange: { min: number; max: number };
}

class SearchService {
  private static instance: SearchService;

  private constructor() {}

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  // Main search function with filtering and sorting
  async searchEvents(filters: SearchFilters): Promise<SearchResult> {
    const {
      query = '',
      category,
      venue,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      availableOnly = false,
      sortBy = 'startTime',
      sortOrder = 'asc',
      limit = 20,
      offset = 0
    } = filters;

    // Build where clause
    const where: any = {};

    // Text search across name, description, and venue
    if (query.trim()) {
      const searchTerm = query.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { venue: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Venue filter
    if (venue) {
      where.venue = { contains: venue, mode: 'insensitive' };
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    // Date range filter
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }

    // Available capacity filter
    if (availableOnly) {
      where.availableCapacity = { gt: 0 };
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'startTime') {
      orderBy.startTime = sortOrder;
    } else if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'capacity') {
      orderBy.capacity = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    }

    // Execute search query
    const [events, total, categories, venues, priceStats] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset
      }),
      prisma.event.count({ where }),
      this.getCategories(),
      this.getVenues(),
      this.getPriceRange()
    ]);

    return {
      events: events.map(event => ({
        ...event,
        price: Number(event.price) // Convert Decimal to number
      })),
      total,
      hasMore: offset + events.length < total,
      categories,
      venues,
      priceRange: priceStats
    };
  }

  // Get available categories with counts
  private async getCategories(): Promise<{ category: EventCategory; count: number }[]> {
    const categories = await prisma.$queryRaw<{ category: EventCategory; count: bigint }[]>`
      SELECT category, COUNT(*) as count
      FROM events
      GROUP BY category
      ORDER BY count DESC
    `;

    return categories.map(cat => ({
      category: cat.category,
      count: Number(cat.count)
    }));
  }

  // Get available venues with counts
  private async getVenues(): Promise<{ venue: string; count: number }[]> {
    const venues = await prisma.$queryRaw<{ venue: string; count: bigint }[]>`
      SELECT venue, COUNT(*) as count
      FROM events
      GROUP BY venue
      ORDER BY count DESC
      LIMIT 10
    `;

    return venues.map(venue => ({
      venue: venue.venue,
      count: Number(venue.count)
    }));
  }

  // Get price range
  private async getPriceRange(): Promise<{ min: number; max: number }> {
    const result = await prisma.$queryRaw<{ min_price: number; max_price: number }[]>`
      SELECT 
        COALESCE(MIN(price::numeric), 0) as min_price,
        COALESCE(MAX(price::numeric), 0) as max_price
      FROM events
    `;

    return {
      min: Number(result[0]?.min_price || 0),
      max: Number(result[0]?.max_price || 0)
    };
  }

  // Get search suggestions based on query
  async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

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

    return Array.from(suggestionSet).slice(0, 5);
  }

  // Get popular/trending searches
  async getPopularSearches(): Promise<string[]> {
    const [popularCategories, popularVenues] = await Promise.all([
      this.getCategories(),
      this.getVenues()
    ]);

    return [
      ...popularCategories.slice(0, 5).map(cat => cat.category.toLowerCase()),
      ...popularVenues.slice(0, 3).map(venue => venue.venue)
    ].slice(0, 8);
  }

  // Get events similar to a given event
  async getSimilarEvents(eventId: string, limit: number = 5): Promise<any[]> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        category: true,
        venue: true,
        price: true
      }
    });

    if (!event) return [];

    // Find similar events based on category, venue, and price
    const similarEvents = await prisma.event.findMany({
      where: {
        AND: [
          { id: { not: eventId } }, // Exclude the current event
          {
            OR: [
              { category: event.category },
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
      take: limit,
      orderBy: {
        startTime: 'asc'
      }
    });

    return similarEvents.map(evt => ({
      ...evt,
      price: Number(evt.price)
    }));
  }

  // Get upcoming events
  async getUpcomingEvents(limit: number = 10): Promise<any[]> {
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
      take: limit
    });

    return events.map(event => ({
      ...event,
      price: Number(event.price)
    }));
  }

  // Get events by category
  async getEventsByCategory(category: EventCategory, limit: number = 10): Promise<any[]> {
    const events = await prisma.event.findMany({
      where: {
        category,
        startTime: {
          gte: new Date()
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: limit
    });

    return events.map(event => ({
      ...event,
      price: Number(event.price)
    }));
  }

  // Get events by venue
  async getEventsByVenue(venue: string, limit: number = 10): Promise<any[]> {
    const events = await prisma.event.findMany({
      where: {
        venue: {
          contains: venue,
          mode: 'insensitive'
        },
        startTime: {
          gte: new Date()
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: limit
    });

    return events.map(event => ({
      ...event,
      price: Number(event.price)
    }));
  }
}

export default SearchService.getInstance();
