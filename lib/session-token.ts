import { SignJWT, jwtVerify } from 'jose';
import type { Role } from './types';

export const SESSION_COOKIE = 'travel_session';
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionPayload {
  userId: number;
  role: Role;
  expiresAt: string;
}

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or shorter than 32 characters. Run `npm run setup` or copy .env.example to .env.local.',
    );
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key());
}

/** Verify a session token. Returns null for missing, tampered or expired tokens. */
export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    const { userId, role, expiresAt } = payload as unknown as SessionPayload;
    if (typeof userId !== 'number' || (role !== 'user' && role !== 'admin')) return null;
    return { userId, role, expiresAt };
  } catch {
    return null;
  }
}
