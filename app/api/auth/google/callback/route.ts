import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GOOGLE_STATE_COOKIE, exchangeCode, secretsMatch } from '@/lib/google-oauth';
import { createSession } from '@/lib/session';
import { clientIp, safeRelativePath } from '@/lib/request';
import {
  createUser,
  findUserByEmail,
  findUserByGoogleId,
  hasPassword,
  linkGoogleAccount,
  logAction,
  type UserAccount,
} from '@/lib/queries/users';

interface PendingLogin {
  state: string;
  verifier: string;
  nonce: string;
  next: string | null;
  expiresAt: number;
}

function readPending(raw: string | undefined): PendingLogin | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingLogin>;
    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.verifier !== 'string' ||
      typeof parsed.nonce !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    return {
      state: parsed.state,
      verifier: parsed.verifier,
      nonce: parsed.nonce,
      next: safeRelativePath(parsed.next),
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const pending = readPending(cookieStore.get(GOOGLE_STATE_COOKIE)?.value);

  const stop = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  };

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (url.searchParams.get('error')) return stop('google_cancelled');
  if (!pending || !code || !state) return stop('google');
  if (pending.expiresAt < Date.now()) return stop('google_expired');
  if (!secretsMatch(pending.state, state)) return stop('google');

  const profile = await exchangeCode(request, code, pending.verifier, pending.nonce);
  if (!profile) return stop('google');
  if (!profile.email_verified) return stop('google_email');

  const ip = await clientIp();
  let user: UserAccount | undefined = await findUserByGoogleId(profile.sub);
  let created = false;

  if (!user) {
    const existing = await findUserByEmail(profile.email);

    if (existing && (await hasPassword(existing.id))) {
      await logAction({
        userId: existing.id,
        action: 'user.google.link.refused',
        entity: 'user',
        entityId: existing.id,
        details: `Google link refused: ${existing.email} already has a password`,
        ip,
      });
      return stop('account_exists');
    }

    if (existing) {
      await linkGoogleAccount(existing.id, profile.sub);
      await logAction({
        userId: existing.id,
        action: 'user.google.link',
        entity: 'user',
        entityId: existing.id,
        details: `Google account linked to ${existing.email}`,
        ip,
      });
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
      await logAction({
        userId: id,
        action: 'user.register',
        entity: 'user',
        entityId: id,
        details: `Account created for ${profile.email} via Google`,
        ip,
      });
      user = await findUserByGoogleId(profile.sub);
      created = true;
    }
  }

  if (!user) return stop('google');
  if (user.status === 'suspended') return stop('account_suspended');

  if (!created) {
    await logAction({
      userId: user.id,
      action: 'user.login',
      entity: 'user',
      entityId: user.id,
      details: `Google sign-in by ${user.email}`,
      ip,
    });
  }
  await createSession(user.id, user.role, user.session_version);

  const target = pending.next ?? (user.role === 'admin' ? '/admin' : '/account');
  const response = NextResponse.redirect(new URL(target, url.origin));
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  return response;
}
