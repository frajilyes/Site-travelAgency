import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { Role } from './types';

const PRODUCTION = process.env.NODE_ENV === 'production';

export const SESSION_COOKIE = PRODUCTION ? '__Host-skyroute_session' : 'skyroute_session';

export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
const RENEW_THRESHOLD_MS = SESSION_IDLE_MS / 4;

const ISSUER = 'skyroute';
const AUDIENCE = 'skyroute-web';
const ALGORITHM = 'HS256';

export interface SessionPayload {
  userId: number;
  role: Role;
  version: number;
  absoluteExpiry: number;
  expiresAt: number;
}

let cachedKey: Uint8Array | undefined;

function key(): Uint8Array {
  if (cachedKey) return cachedKey;

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or shorter than 32 characters. Run `npm run setup`.',
    );
  }
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

export interface IssueOptions {
  userId: number;
  role: Role;
  version: number;
  absoluteExpiry?: number;
}

export interface IssuedToken {
  token: string;
  expiresAt: Date;
  absoluteExpiry: Date;
}

export async function issueToken(options: IssueOptions): Promise<IssuedToken> {
  const nowMs = Date.now();
  const absolute = options.absoluteExpiry ?? nowMs + SESSION_ABSOLUTE_MS;
  const expires = Math.min(nowMs + SESSION_IDLE_MS, absolute);

  const token = await new SignJWT({
    role: options.role,
    ver: options.version,
    abs: Math.floor(absolute / 1000),
  })
    .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
    .setSubject(String(options.userId))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setNotBefore(Math.floor(nowMs / 1000))
    .setExpirationTime(Math.floor(expires / 1000))
    .sign(key());

  return { token, expiresAt: new Date(expires), absoluteExpiry: new Date(absolute) };
}

interface Claims extends JWTPayload {
  role?: unknown;
  ver?: unknown;
  abs?: unknown;
}

export async function verifyToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify<Claims>(token, key(), {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: 0,
    });

    const userId = Number(payload.sub);
    const { role, ver, abs, exp } = payload;

    if (!Number.isSafeInteger(userId) || userId <= 0) return null;
    if (role !== 'user' && role !== 'admin') return null;
    if (typeof ver !== 'number' || !Number.isSafeInteger(ver) || ver < 0) return null;
    if (typeof abs !== 'number' || typeof exp !== 'number') return null;

    const absoluteExpiry = abs * 1000;
    if (absoluteExpiry <= Date.now()) return null;

    return { userId, role, version: ver, absoluteExpiry, expiresAt: exp * 1000 };
  } catch {
    return null;
  }
}

export function shouldRenew(session: SessionPayload): boolean {
  return session.expiresAt - Date.now() < RENEW_THRESHOLD_MS;
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: PRODUCTION,
    sameSite: 'lax' as const,
    path: '/',
    expires,
  };
}
