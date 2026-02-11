import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

export interface AuthUser {
  id: number;
  role: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  let token: string | undefined;

  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice('Bearer '.length);
  } else if (req.query.token) {
    // Soporte para tokens en query params (usado para descargas directas)
    token = req.query.token as string;
  }

  if (!token) return res.status(401).json({ error: 'missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // attach user to request
    (req as any).user = { id: payload.sub, role: payload.role } as AuthUser;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  let token: string | undefined;

  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice('Bearer '.length);
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) return next();

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = { id: payload.sub, role: payload.role } as AuthUser;
  } catch (err) {
    // ignore and continue as anonymous
  }
  return next();
}
