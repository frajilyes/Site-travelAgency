import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { findActiveUser } from './queries/users';
import { readSession } from './session';
import { safeRelativePath } from './request';
import type { PublicUser } from './types';

export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await readSession();
  if (!session) return null;

  const account = await findActiveUser(session.userId);
  if (!account) return null;

  if (account.session_version !== session.version) return null;

  return {
    id: account.id,
    email: account.email,
    first_name: account.first_name,
    last_name: account.last_name,
    phone: account.phone,
    role: account.role,
    status: account.status,
    created_at: account.created_at,
  };
});

export async function requireUser(returnTo?: string): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    const next = safeRelativePath(returnTo);
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  }
  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=%2Fadmin');
  if (user.role !== 'admin') redirect('/account');
  return user;
}
