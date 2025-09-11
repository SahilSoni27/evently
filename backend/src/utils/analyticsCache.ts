import redisCache from '../lib/redis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
}

export class AnalyticsCache {
  private static readonly DEFAULT_TTL = 300; // 5 minutes
  private static readonly PREFIX = 'admin:analytics';

  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<{ data: T; cached: boolean }> {
    const { ttl = this.DEFAULT_TTL, prefix = this.PREFIX } = options;
    const fullKey = `${prefix}:${key}`;

    try {
      // Try to get from cache first
      const cachedData = await redisCache.get<T>(fullKey);
      if (cachedData) {
        return { data: cachedData, cached: true };
      }

      // If not in cache, fetch fresh data
      const freshData = await fetcher();
      
      // Cache the fresh data
      await redisCache.set(fullKey, freshData, ttl);
      
      return { data: freshData, cached: false };
    } catch (error) {
      console.error('Analytics cache error:', error);
      // Fallback to fetching fresh data if cache fails
      const freshData = await fetcher();
      return { data: freshData, cached: false };
    }
  }

  static async invalidate(pattern: string): Promise<void> {
    try {
      const fullPattern = `${this.PREFIX}:${pattern}`;
      // Note: In production, you might want to use SCAN instead of KEYS for better performance
      await redisCache.del(fullPattern);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  static async invalidateAll(): Promise<void> {
    try {
      // This would need a more sophisticated implementation in production
      // For now, we'll use a simple approach
      await redisCache.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // Event-specific cache invalidation
  static async invalidateEventCache(eventId?: string): Promise<void> {
    const patterns = [
      'overview',
      'events',
      'bookings',
      'revenue'
    ];

    if (eventId) {
      patterns.push(`event:${eventId}`);
    }

    await Promise.all(
      patterns.map(pattern => this.invalidate(pattern))
    );
  }

  // User-specific cache invalidation
  static async invalidateUserCache(): Promise<void> {
    const patterns = [
      'overview',
      'users'
    ];

    await Promise.all(
      patterns.map(pattern => this.invalidate(pattern))
    );
  }
}

export default AnalyticsCache;
