import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { findActiveUser } from './queries/users';
import { readSession } from './session';
import type { PublicUser } from './types';

/**
 * Resolve the signed-in user from the session cookie and re-check them against
 * the database, so a suspended or deleted account loses access immediately.
 * Memoized per render pass.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await readSession();
  if (!session) return null;

  return (await findActiveUser(session.userId)) ?? null;
});

/** Require a signed-in user, or redirect to the login page. */
export async function requireUser(returnTo?: string): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/connexion?next=${encodeURIComponent(returnTo)}` : '/connexion');
  }
  return user;
}

/** Require an administrator, or redirect. Used by every admin page and action. */
export async function requireAdmin(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion?next=%2Fadmin');
  if (user.role !== 'admin') redirect('/compte');
  return user;
}
