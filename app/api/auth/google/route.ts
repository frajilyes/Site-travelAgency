import { NextResponse } from 'next/server';
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_MAX_AGE,
  authorizationUrl,
} from '@/lib/google-oauth';
import { isProduction } from '@/lib/env';
import { clientIp, safeRelativePath } from '@/lib/request';
import { RULES, consume } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const url = new URL(request.url);

  const quota = await consume('oauth:start', await clientIp(), RULES.oauthStart);
  if (!quota.allowed) {
    return NextResponse.redirect(new URL('/login?error=too_many_attempts', url.origin));
  }

  const next = safeRelativePath(url.searchParams.get('next'));
  const start = authorizationUrl(request);

  if (!start) {
    return NextResponse.redirect(new URL('/login?error=google_unavailable', url.origin));
  }

  const response = NextResponse.redirect(start.url);
  const pending = JSON.stringify({
    state: start.state,
    verifier: start.verifier,
    nonce: start.nonce,
    next,
    expiresAt: Date.now() + GOOGLE_STATE_MAX_AGE * 1000,
  });

  response.cookies.set(GOOGLE_STATE_COOKIE, pending, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: GOOGLE_STATE_MAX_AGE,
  });

  return response;
}
