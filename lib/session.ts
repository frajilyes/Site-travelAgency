import 'server-only';
import { cookies } from 'next/headers';
import type { Role } from './types';
import {
  SESSION_COOKIE,
  SESSION_DURATION_MS,
  type SessionPayload,
  decrypt,
  encrypt,
} from './session-token';

export type { SessionPayload };
export { SESSION_COOKIE, decrypt };

export async function createSession(userId: number, role: Role): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await encrypt({ userId, role, expiresAt: expiresAt.toISOString() });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
