"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
class SearchService {
    constructor() { }
    static getInstance() {
        if (!SearchService.instance) {
            SearchService.instance = new SearchService();
        }
        return SearchService.instance;
    }
    // Main search function with filtering and sorting
    async searchEvents(filters) {
        const { query = '', category, venue, minPrice, maxPrice, startDate, endDate, availableOnly = false, sortBy = 'startTime', sortOrder = 'asc', limit = 20, offset = 0 } = filters;
        // Build where clause
        const where = {};
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
            if (minPrice !== undefined)
                where.price.gte = minPrice;
            if (maxPrice !== undefined)
                where.price.lte = maxPrice;
        }
        // Date range filter
        if (startDate || endDate) {
            where.startTime = {};
            if (startDate)
                where.startTime.gte = startDate;
            if (endDate)
                where.startTime.lte = endDate;
        }
        // Available capacity filter
        if (availableOnly) {
            where.availableCapacity = { gt: 0 };
        }
        // Build order by clause
        const orderBy = {};
        if (sortBy === 'startTime') {
            orderBy.startTime = sortOrder;
        }
        else if (sortBy === 'price') {
            orderBy.price = sortOrder;
        }
        else if (sortBy === 'capacity') {
            orderBy.capacity = sortOrder;
        }
        else if (sortBy === 'name') {
            orderBy.name = sortOrder;
        }
        else if (sortBy === 'createdAt') {
            orderBy.createdAt = sortOrder;
        }
        // Execute search query
        const [events, total, categories, venues, priceStats] = await Promise.all([
            prisma_1.default.event.findMany({
                where,
                orderBy,
                take: limit,
                skip: offset
            }),
            prisma_1.default.event.count({ where }),
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
    async getCategories() {
        const categories = await prisma_1.default.$queryRaw `
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
    async getVenues() {
        const venues = await prisma_1.default.$queryRaw `
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
    async getPriceRange() {
        const result = await prisma_1.default.$queryRaw `
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
    async getSearchSuggestions(query) {
        if (!query || query.length < 2)
            return [];
        const suggestions = await prisma_1.default.event.findMany({
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
        const suggestionSet = new Set();
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
    async getPopularSearches() {
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
    async getSimilarEvents(eventId, limit = 5) {
        const event = await prisma_1.default.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                category: true,
                venue: true,
                price: true
            }
        });
        if (!event)
            return [];
        // Find similar events based on category, venue, and price
        const similarEvents = await prisma_1.default.event.findMany({
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
                                    lte: Number(event.price) * 1.5 // 50% higher
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
    async getUpcomingEvents(limit = 10) {
        const events = await prisma_1.default.event.findMany({
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
    async getEventsByCategory(category, limit = 10) {
        const events = await prisma_1.default.event.findMany({
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
    async getEventsByVenue(venue, limit = 10) {
        const events = await prisma_1.default.event.findMany({
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
exports.default = SearchService.getInstance();
