import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isTokenBlacklisted } from './redis';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Define a type for JWT payload and req.user
export type UserPayload = {
  userId: string;
  role: string;
  [key: string]: any;
};

// AuthRequest allows a user object with userId and role, matching JWT payload
export interface AuthRequest extends Request {
  user?: UserPayload;
}

export async function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    // Check if token is blacklisted (logged out)
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }
    // Verify token and assign to req.user
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    // Optionally log error for debugging
    // console.error('JWT verification error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function authorizeRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

declare global {
  namespace Express {
    interface User {
      userId: string;
      roles?: string[];
      role: string;
    }
    interface Request {
      user?: User;
    }
  }
}
