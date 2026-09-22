import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

/** Short-lived cookie holding the anti-CSRF state, the PKCE verifier and `next`. */
export const GOOGLE_STATE_COOKIE = 'google_oauth';
export const GOOGLE_STATE_MAX_AGE = 10 * 60;

export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

function config(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** The button is only shown when the OAuth client is configured. */
export function isGoogleEnabled(): boolean {
  return config() !== null;
}

/**
 * Where Google sends the browser back. `APP_URL` wins so the value matches the
 * URI registered in the Google console; the incoming request is the fallback.
 */
export function callbackUrl(request: Request): string {
  const base = process.env.APP_URL?.trim() || new URL(request.url).origin;
  return new URL(GOOGLE_CALLBACK_PATH, base).toString();
}

export interface OAuthStart {
  url: string;
  state: string;
  verifier: string;
}

/** Build the consent-screen URL along with the values to keep in the cookie. */
export function authorizationUrl(request: Request): OAuthStart | null {
  const client = config();
  if (!client) return null;

  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', client.clientId);
  url.searchParams.set('redirect_uri', callbackUrl(request));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');

  return { url: url.toString(), state, verifier };
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  first_name: string;
  last_name: string;
}

/**
 * Trade the authorization code for an ID token and read the profile out of it.
 * Returns null whenever Google refuses the exchange or the token does not
 * verify against Google's public keys.
 */
export async function exchangeCode(
  request: Request,
  code: string,
  verifier: string,
): Promise<GoogleProfile | null> {
  const client = config();
  if (!client) return null;

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: callbackUrl(request),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    console.warn('[skyroute] échange du code Google refusé :', await response.text());
    return null;
  }

  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  if (!idToken) return null;

  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: ISSUERS,
      audience: client.clientId,
    });

    const email = typeof payload.email === 'string' ? payload.email : null;
    if (!email || typeof payload.sub !== 'string') return null;

    const given = typeof payload.given_name === 'string' ? payload.given_name : '';
    const family = typeof payload.family_name === 'string' ? payload.family_name : '';
    const full = typeof payload.name === 'string' ? payload.name : '';

    return {
      sub: payload.sub,
      email,
      email_verified: payload.email_verified === true,
      first_name: given || full.split(' ')[0] || email.split('@')[0],
      last_name: family || full.split(' ').slice(1).join(' ') || '—',
    };
  } catch (error) {
    console.warn('[skyroute] jeton Google invalide :', error);
    return null;
  }
}
