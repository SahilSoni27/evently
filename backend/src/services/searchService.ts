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
  tags?: string[];
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
  filters: {
    categories: { category: EventCategory; count: number }[];
    venues: { venue: string; count: number }[];
    priceRange: { min: number; max: number };
    tags: { tag: string; count: number }[];
  };
  suggestions: string[];
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
      tags = [],
      availableOnly = false,
      sortBy = 'startTime',
      sortOrder = 'asc',
      limit = 20,
      offset = 0
    } = filters;

    // Build where clause
    const where: any = {};

    // Text search across name, description, venue, and tags
    if (query.trim()) {
      const searchTerms = query.trim().split(' ').filter(term => term.length > 0);
      where.OR = searchTerms.map(term => ({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { venue: { contains: term, mode: 'insensitive' } },
          { tags: { hasSome: [term] } }
        ]
      }));
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

    // Tags filter
    if (tags.length > 0) {
      where.tags = { hassome: tags };
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
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: {
              bookings: true,
              waitlist: true
            }
          }
        }
      }),
      prisma.event.count({ where })
    ]);

    // Get search filters data for faceted search
    const filtersData = await this.getSearchFilters(query);
    
    // Get search suggestions
    const suggestions = await this.getSearchSuggestions(query);

    return {
      events: events.map(event => ({
        ...event,
        totalBookings: event._count.bookings,
        waitlistCount: event._count.waitlist,
        price: Number(event.price) // Convert Decimal to number
      })),
      total,
      hasMore: offset + events.length < total,
      filters: filtersData,
      suggestions
    };
  }

  // Get available filter options with counts
  private async getSearchFilters(query?: string): Promise<SearchResult['filters']> {
    const baseWhere: any = {};
    
    // Apply text search if provided
    if (query?.trim()) {
      const searchTerms = query.trim().split(' ').filter(term => term.length > 0);
      baseWhere.OR = searchTerms.map(term => ({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { venue: { contains: term, mode: 'insensitive' } },
          { tags: { hasSome: [term] } }
        ]
      }));
    }

    const [categoryStats, venueStats, priceStats, tagStats] = await Promise.all([
      // Category counts
      prisma.event.groupBy({
        by: ['category'],
        where: baseWhere,
        _count: {
          _all: true
        }
      }),

      // Venue counts
      prisma.event.groupBy({
        by: ['venue'],
        where: baseWhere,
        _count: true,
        orderBy: { _count: { _all: 'desc' } },
        take: 10
      }),

      // Price range
      prisma.event.aggregate({
        where: baseWhere,
        _min: { price: true },
        _max: { price: true }
      }),

      // Tag counts - this requires a more complex query
      prisma.$queryRaw`
        SELECT tag, COUNT(*) as count
        FROM (
          SELECT UNNEST(tags) as tag
          FROM events
          ${query ? 'WHERE ' + this.buildTextSearchCondition(query) : ''}
        ) tag_counts
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 20
      `
    ]);

    return {
      categories: categoryStats.map(stat => ({
        category: stat.category as EventCategory,
        count: stat._count
      })),
      venues: venueStats.map(stat => ({
        venue: stat.venue,
        count: stat._count
      })),
      priceRange: {
        min: Number(priceStats._min.price) || 0,
        max: Number(priceStats._max.price) || 0
      },
      tags: (tagStats as any[]).map(stat => ({
        tag: stat.tag,
        count: Number(stat.count)
      }))
    };
  }

  // Get search suggestions based on query
  private async getSearchSuggestions(query?: string): Promise<string[]> {
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
        venue: true,
        tags: true
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
      
      // Add matching tags
      event.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          suggestionSet.add(tag);
        }
      });
    });

    return Array.from(suggestionSet).slice(0, 5);
  }

  // Helper to build text search condition for raw queries
  private buildTextSearchCondition(query: string): string {
    const terms = query.trim().split(' ').filter(term => term.length > 0);
    const conditions = terms.map(term => 
      `(name ILIKE '%${term}%' OR description ILIKE '%${term}%' OR venue ILIKE '%${term}%')`
    );
    return conditions.join(' AND ');
  }

  // Advanced search with full-text capabilities
  async advancedSearch(filters: SearchFilters & { fullTextSearch?: boolean }): Promise<SearchResult> {
    if (filters.fullTextSearch && filters.query) {
      // Use PostgreSQL full-text search if available
      return this.fullTextSearch(filters);
    }
    
    return this.searchEvents(filters);
  }

  // Full-text search using PostgreSQL tsvector (requires setup)
  private async fullTextSearch(filters: SearchFilters): Promise<SearchResult> {
    // This would require setting up tsvector columns in the database
    // For now, fall back to regular search
    return this.searchEvents(filters);
  }

  // Get popular/trending searches
  async getPopularSearches(): Promise<string[]> {
    // In a real app, you'd track search queries and return popular ones
    // For now, return some predefined popular searches based on event data
    const popularCategories = await prisma.event.groupBy({
      by: ['category'],
      _count: true,
      orderBy: { _count: { _all: 'desc' } },
      take: 5
    });

    const popularVenues = await prisma.event.groupBy({
      by: ['venue'],
      _count: true,
      orderBy: { _count: { _all: 'desc' } },
      take: 3
    });

    return [
      ...popularCategories.map(cat => cat.category.toLowerCase()),
      ...popularVenues.map(venue => venue.venue)
    ].slice(0, 8);
  }

  // Get events similar to a given event
  async getSimilarEvents(eventId: string, limit: number = 5): Promise<any[]> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        category: true,
        tags: true,
        venue: true,
        price: true
      }
    });

    if (!event) return [];

    // Find similar events based on category, tags, venue, and price
    const similarEvents = await prisma.event.findMany({
      where: {
        AND: [
          { id: { not: eventId } }, // Exclude the current event
          {
            OR: [
              { category: event.category },
              { tags: { hasSome: event.tags } },
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
      },
      include: {
        _count: {
          select: {
            bookings: true
          }
        }
      }
    });

    return similarEvents.map(evt => ({
      ...evt,
      price: Number(evt.price),
      totalBookings: evt._count.bookings
    }));
  }
}

export default SearchService.getInstance();
