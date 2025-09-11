"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSimilarEvents = exports.getUpcomingEvents = exports.getPopularSearches = exports.getSearchSuggestions = exports.searchEvents = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
// GET /api/search - Search events
const searchEvents = async (req, res) => {
    try {
        const { query = '', venue, minPrice, maxPrice, startDate, endDate, availableOnly = 'false', sortBy = 'startTime', sortOrder = 'asc', limit = '20', offset = '0' } = req.query;
        const limitNum = Math.min(parseInt(limit) || 20, 100);
        const offsetNum = parseInt(offset) || 0;
        // Build where clause
        const where = {};
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
        const minPriceNum = minPrice ? parseFloat(minPrice) : undefined;
        const maxPriceNum = maxPrice ? parseFloat(maxPrice) : undefined;
        if (minPriceNum !== undefined || maxPriceNum !== undefined) {
            where.price = {};
            if (minPriceNum !== undefined)
                where.price.gte = minPriceNum;
            if (maxPriceNum !== undefined)
                where.price.lte = maxPriceNum;
        }
        // Date range filter
        const startDateObj = startDate ? new Date(startDate) : undefined;
        const endDateObj = endDate ? new Date(endDate) : undefined;
        if (startDateObj || endDateObj) {
            where.startTime = {};
            if (startDateObj)
                where.startTime.gte = startDateObj;
            if (endDateObj)
                where.startTime.lte = endDateObj;
        }
        // Available capacity filter
        if (availableOnly === 'true') {
            where.availableCapacity = { gt: 0 };
        }
        // Build order by clause
        const orderBy = {};
        const validSortFields = ['startTime', 'price', 'capacity', 'name', 'createdAt'];
        if (validSortFields.includes(sortBy)) {
            orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
        }
        else {
            orderBy.startTime = 'asc';
        }
        // Execute search query
        const [events, total] = await Promise.all([
            prisma_1.default.event.findMany({
                where,
                orderBy,
                take: limitNum,
                skip: offsetNum
            }),
            prisma_1.default.event.count({ where })
        ]);
        // Get filter information
        const [venues, priceStats] = await Promise.all([
            prisma_1.default.event.findMany({
                select: { venue: true },
                distinct: ['venue'],
                take: 20
            }).then(results => results.map(r => r.venue)),
            prisma_1.default.event.aggregate({
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
    }
    catch (error) {
        console.error('Search events error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to search events'
        });
    }
};
exports.searchEvents = searchEvents;
// GET /api/search/suggestions - Get search suggestions
const getSearchSuggestions = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || typeof query !== 'string' || query.length < 2) {
            return res.json({
                status: 'success',
                data: { suggestions: [] }
            });
        }
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
        res.json({
            status: 'success',
            data: {
                suggestions: Array.from(suggestionSet).slice(0, 5)
            }
        });
    }
    catch (error) {
        console.error('Get search suggestions error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get search suggestions'
        });
    }
};
exports.getSearchSuggestions = getSearchSuggestions;
// GET /api/search/popular - Get popular search terms
const getPopularSearches = async (req, res) => {
    try {
        // Get most common venues as popular searches
        const venues = await prisma_1.default.$queryRaw `
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
    }
    catch (error) {
        console.error('Get popular searches error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get popular searches'
        });
    }
};
exports.getPopularSearches = getPopularSearches;
// GET /api/search/upcoming - Get upcoming events
const getUpcomingEvents = async (req, res) => {
    try {
        const { limit = '10' } = req.query;
        const limitNum = Math.min(parseInt(limit) || 10, 50);
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
    }
    catch (error) {
        console.error('Get upcoming events error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get upcoming events'
        });
    }
};
exports.getUpcomingEvents = getUpcomingEvents;
// GET /api/search/similar/:eventId - Get similar events
const getSimilarEvents = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { limit = '5' } = req.query;
        const limitNum = Math.min(parseInt(limit) || 5, 20);
        const event = await prisma_1.default.event.findUnique({
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
        const similarEvents = await prisma_1.default.event.findMany({
            where: {
                AND: [
                    { id: { not: eventId } }, // Exclude the current event
                    {
                        OR: [
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
    }
    catch (error) {
        console.error('Get similar events error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get similar events'
        });
    }
};
exports.getSimilarEvents = getSimilarEvents;
