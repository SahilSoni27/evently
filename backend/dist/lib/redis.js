"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisCache = void 0;
const ioredis_1 = require("ioredis");
class RedisCache {
    constructor() {
        this.client = new ioredis_1.Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
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
    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await this.client.setex(key, ttlSeconds, serialized);
            }
            else {
                await this.client.set(key, serialized);
            }
            return true;
        }
        catch (error) {
            console.error('Redis set error:', error);
            return false;
        }
    }
    async del(key) {
        try {
            await this.client.del(key);
            return true;
        }
        catch (error) {
            console.error('Redis del error:', error);
            return false;
        }
    }
    async exists(key) {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error('Redis exists error:', error);
            return false;
        }
    }
    async clear() {
        try {
            await this.client.flushall();
            return true;
        }
        catch (error) {
            console.error('Redis clear error:', error);
            return false;
        }
    }
    async increment(key, by = 1) {
        try {
            return await this.client.incrby(key, by);
        }
        catch (error) {
            console.error('Redis increment error:', error);
            return null;
        }
    }
    async setHash(key, field, value) {
        try {
            await this.client.hset(key, field, JSON.stringify(value));
            return true;
        }
        catch (error) {
            console.error('Redis setHash error:', error);
            return false;
        }
    }
    async getHash(key, field) {
        try {
            const value = await this.client.hget(key, field);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error('Redis getHash error:', error);
            return null;
        }
    }
    async disconnect() {
        await this.client.disconnect();
    }
}
exports.redisCache = new RedisCache();
exports.default = exports.redisCache;
