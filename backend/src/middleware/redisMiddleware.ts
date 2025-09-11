import { Request, Response, NextFunction } from 'express';
import redisCache from '../lib/redis';

export const redisHealthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Simple ping test
    await redisCache.set('health-check', 'ok', 5);
    const result = await redisCache.get('health-check');
    
    if (result === 'ok') {
      // Redis is working fine, continue
      next();
    } else {
      console.warn('Redis health check failed - proceeding without cache');
      next();
    }
  } catch (error) {
    console.warn('Redis health check error - proceeding without cache:', error);
    next();
  }
};

export const optionalCache = (cacheFn: Function) => {
  return async (...args: any[]) => {
    try {
      return await cacheFn(...args);
    } catch (error) {
      console.warn('Cache operation failed, falling back to direct database query:', error);
      // Return cache miss result to trigger direct database query
      return { data: null, cached: false };
    }
  };
};
