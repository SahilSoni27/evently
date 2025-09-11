import { Redis } from 'ioredis';

class RedisCache {
  private client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: false,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.client.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
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

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}

export const redisCache = new RedisCache();
export default redisCache;
