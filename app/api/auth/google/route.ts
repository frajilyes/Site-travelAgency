import { NextResponse } from 'next/server';
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_MAX_AGE,
  authorizationUrl,
} from '@/lib/google-oauth';

/** Only same-origin relative paths survive the round trip to Google. */
function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

/** Entry point of the "Continuer avec Google" button: starts the OAuth dance. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  const start = authorizationUrl(request);

  if (!start) {
    return NextResponse.redirect(new URL('/connexion?error=google_indisponible', url.origin));
  }

  const response = NextResponse.redirect(start.url);
  const pending = JSON.stringify({ state: start.state, verifier: start.verifier, next });

  response.cookies.set(GOOGLE_STATE_COOKIE, pending, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: GOOGLE_STATE_MAX_AGE,
  });

  return response;
}
