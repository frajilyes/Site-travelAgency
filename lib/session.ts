import 'server-only';
import { cookies } from 'next/headers';
import type { Role } from './types';
import {
  SESSION_COOKIE,
  type SessionPayload,
  issueToken,
  sessionCookieOptions,
  verifyToken,
} from './session-token';

export type { SessionPayload };
export { SESSION_COOKIE, verifyToken };

export async function createSession(userId: number, role: Role, version: number): Promise<void> {
  const { token, expiresAt } = await issueToken({ userId, role, version });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, '', sessionCookieOptions(new Date(0)));
  cookieStore.delete(SESSION_COOKIE);
}
