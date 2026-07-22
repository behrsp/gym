import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-gym-evolution-12345';

export interface AuthUser {
  id: number;
  phone: string;
  email: string | null;
  name: string;
  role: 'personal' | 'student';
  profile_picture: string | null;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function getUserFromRequest(req: NextRequest): Promise<AuthUser | null> {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || !decoded.id) return null;

    const res = await query(
      'SELECT id, phone, email, name, role, profile_picture FROM users WHERE id = $1',
      [decoded.id]
    );

    if (res.rowCount === 0) return null;
    return res.rows[0] as AuthUser;
  } catch (err) {
    console.error('Auth verification error:', err);
    return null;
  }
}
