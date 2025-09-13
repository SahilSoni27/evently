import { Redis } from 'ioredis';

class RedisCache {
  private client: Redis;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isUpstash = process.env.REDIS_URL?.includes('upstash.io');
    
    // Configuration optimized for both local Redis and Upstash
    const redisConfig = {
      maxRetriesPerRequest: isUpstash ? 5 : 3,
      lazyConnect: true,
      enableReadyCheck: false,
      connectTimeout: isUpstash ? 30000 : 10000,
      commandTimeout: isUpstash ? 10000 : 5000,
      retryDelayOnFailover: 500,
      retryDelayFunction: (times: number) => Math.min(times * 50, 2000),
      // Only apply Upstash-specific settings when needed
      ...(isUpstash && {
        keepAlive: 30000,
        family: 4, // Use IPv4
        enableOfflineQueue: false, // Disable offline queue for better error handling
        disconnectTimeout: 10000,
        enableAutoPipelining: false, // Disable auto-pipelining for Upstash
      }),
      // Local Redis settings
      ...(!isUpstash && {
        enableOfflineQueue: true, // Enable for local Redis
      })
    };

    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', redisConfig);

    this.client.on('error', (err: any) => {
      console.error('❌ Redis error:', {
        message: err.message,
        code: err.code || 'UNKNOWN',
        syscall: err.syscall || 'UNKNOWN'
      });
      
      // Handle specific ECONNRESET errors
      if (err.message.includes('ECONNRESET') || err.code === 'ECONNRESET') {
        console.log('🔄 Redis ECONNRESET detected, connection will be retried automatically');
      }
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully to', this.client.options.host);
    });

    this.client.on('ready', () => {
      console.log('🚀 Redis ready for commands');
    });

    this.client.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    this.client.on('reconnecting', (ms: number) => {
      console.log(`🔄 Redis reconnecting in ${ms}ms...`);
    });

    this.client.on('end', () => {
      console.log('🔚 Redis connection ended');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      await this.client.flushall();
      return true;
    } catch (error) {
      console.error('Redis clear error:', error);
      return false;
    }
  }

  async increment(key: string, by: number = 1): Promise<number | null> {
    try {
      return await this.client.incrby(key, by);
    } catch (error) {
      console.error('Redis increment error:', error);
      return null;
    }
  }

  async setHash(key: string, field: string, value: any): Promise<boolean> {
    try {
      await this.client.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis setHash error:', error);
      return false;
    }
  }

  async getHash<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis getHash error:', error);
      return null;
    }
  }

  async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  isConnected(): boolean {
    return this.client.status === 'ready';
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }
}

export const redisCache = new RedisCache();
export default redisCache;
