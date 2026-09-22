import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GOOGLE_STATE_COOKIE, exchangeCode } from '@/lib/google-oauth';
import { createSession } from '@/lib/session';
import {
  createUser,
  findUserByEmail,
  findUserByGoogleId,
  linkGoogleAccount,
  logAction,
} from '@/lib/queries/users';
import type { User } from '@/lib/types';

interface PendingLogin {
  state: string;
  verifier: string;
  next: string | null;
}

function readPending(raw: string | undefined): PendingLogin | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingLogin>;
    if (typeof parsed.state !== 'string' || typeof parsed.verifier !== 'string') return null;
    return {
      state: parsed.state,
      verifier: parsed.verifier,
      next: typeof parsed.next === 'string' ? parsed.next : null,
    };
  } catch {
    return null;
  }
}

/** Google sends the browser back here with an authorization code. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const pending = readPending(cookieStore.get(GOOGLE_STATE_COOKIE)?.value);

  /** Back to the login page with a message, dropping the pending attempt. */
  const stop = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/connexion?error=${reason}`, url.origin));
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  };

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // The visitor dismissed the consent screen.
  if (url.searchParams.get('error')) return stop('google_annule');
  // Missing or mismatched state: expired attempt, or a forged callback.
  if (!pending || !code || !state || pending.state !== state) return stop('google');

  const profile = await exchangeCode(request, code, pending.verifier);
  if (!profile) return stop('google');
  if (!profile.email_verified) return stop('google_email');

  let user: User | undefined = await findUserByGoogleId(profile.sub);
  let created = false;

  if (!user) {
    // First Google sign-in: reuse the account already registered with that
    // address, otherwise open a new one, without a password.
    const existing = await findUserByEmail(profile.email);
    if (existing) {
      await linkGoogleAccount(existing.id, profile.sub);
      await logAction(
        existing.id,
        'user.google.link',
        'user',
        existing.id,
        `Compte Google lié à ${existing.email}`,
      );
      user = { ...existing, google_id: profile.sub };
    } else {
      const id = await createUser({
        email: profile.email,
        password_hash: '',
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: null,
        google_id: profile.sub,
      });
      await logAction(id, 'user.register', 'user', id, `Création du compte ${profile.email} via Google`);
      user = await findUserByGoogleId(profile.sub);
      created = true;
    }
  }

  if (!user) return stop('google');
  if (user.status === 'suspended') return stop('compte_suspendu');

  if (!created) {
    await logAction(user.id, 'user.login', 'user', user.id, `Connexion Google de ${user.email}`);
  }
  await createSession(user.id, user.role);

  const target = pending.next ?? (user.role === 'admin' ? '/admin' : '/compte');
  const response = NextResponse.redirect(new URL(target, url.origin));
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  return response;
}
