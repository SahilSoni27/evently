"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsCache = void 0;
const redis_1 = __importDefault(require("../lib/redis"));
class AnalyticsCache {
    static async getOrSet(key, fetcher, options = {}) {
        const { ttl = this.DEFAULT_TTL, prefix = this.PREFIX } = options;
        const fullKey = `${prefix}:${key}`;
        try {
            // Try to get from cache first
            const cachedData = await redis_1.default.get(fullKey);
            if (cachedData) {
                return { data: cachedData, cached: true };
            }
            // If not in cache, fetch fresh data
            const freshData = await fetcher();
            // Cache the fresh data
            await redis_1.default.set(fullKey, freshData, ttl);
            return { data: freshData, cached: false };
        }
        catch (error) {
            console.error('Analytics cache error:', error);
            // Fallback to fetching fresh data if cache fails
            const freshData = await fetcher();
            return { data: freshData, cached: false };
        }
    }
    static async invalidate(pattern) {
        try {
            const fullPattern = `${this.PREFIX}:${pattern}`;
            // Note: In production, you might want to use SCAN instead of KEYS for better performance
            await redis_1.default.del(fullPattern);
        }
        catch (error) {
            console.error('Cache invalidation error:', error);
        }
    }
    static async invalidateAll() {
        try {
            // This would need a more sophisticated implementation in production
            // For now, we'll use a simple approach
            await redis_1.default.clear();
        }
        catch (error) {
            console.error('Cache clear error:', error);
        }
    }
    // Event-specific cache invalidation
    static async invalidateEventCache(eventId) {
        const patterns = [
            'overview',
            'events',
            'bookings',
            'revenue'
        ];
        if (eventId) {
            patterns.push(`event:${eventId}`);
        }
        await Promise.all(patterns.map(pattern => this.invalidate(pattern)));
    }
    // User-specific cache invalidation
    static async invalidateUserCache() {
        const patterns = [
            'overview',
            'users'
        ];
        await Promise.all(patterns.map(pattern => this.invalidate(pattern)));
    }
}
exports.AnalyticsCache = AnalyticsCache;
AnalyticsCache.DEFAULT_TTL = 300; // 5 minutes
AnalyticsCache.PREFIX = 'admin:analytics';
exports.default = AnalyticsCache;
