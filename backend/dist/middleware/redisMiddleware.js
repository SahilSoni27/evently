"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalCache = exports.redisHealthCheck = void 0;
const redis_1 = __importDefault(require("../lib/redis"));
const redisHealthCheck = async (req, res, next) => {
    try {
        // Simple ping test
        await redis_1.default.set('health-check', 'ok', 5);
        const result = await redis_1.default.get('health-check');
        if (result === 'ok') {
            // Redis is working fine, continue
            next();
        }
        else {
            console.warn('Redis health check failed - proceeding without cache');
            next();
        }
    }
    catch (error) {
        console.warn('Redis health check error - proceeding without cache:', error);
        next();
    }
};
exports.redisHealthCheck = redisHealthCheck;
const optionalCache = (cacheFn) => {
    return async (...args) => {
        try {
            return await cacheFn(...args);
        }
        catch (error) {
            console.warn('Cache operation failed, falling back to direct database query:', error);
            // Return cache miss result to trigger direct database query
            return { data: null, cached: false };
        }
    };
};
exports.optionalCache = optionalCache;
