import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  flatNo: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: string;
  onboardingCompleted: boolean;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      phone: user.phone,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any } as any,
  );
}

export function verifyToken(token: string): { sub: string; role: string } {
  return jwt.verify(token, config.jwtSecret) as { sub: string; role: string };
}
