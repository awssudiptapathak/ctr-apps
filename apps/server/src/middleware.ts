import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth.js';

export interface AuthedRequest extends Request {
  userId?: string;
  role?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = verifyToken(header.slice(7));
    req.userId = payload.sub;
    req.role = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
