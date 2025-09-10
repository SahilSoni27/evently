import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { AuthenticatedUser } from '../types';

// Middleware to require authentication
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. Invalid token.'
      });
    }

    // Add user info to request object
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role
    } as AuthenticatedUser;

    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Access denied. Token verification failed.'
    });
  }
};

// Middleware to require admin role
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // First check if user is authenticated
  requireAuth(req, res, () => {
    // Check if user has admin role
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
    }
    next();
  });
};
