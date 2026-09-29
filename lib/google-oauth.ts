import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { appOrigin, env, isProduction } from './env';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export const GOOGLE_STATE_COOKIE = isProduction ? '__Host-google_oauth' : 'google_oauth';
export const GOOGLE_STATE_MAX_AGE = 10 * 60;

export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

const TOKEN_TIMEOUT_MS = 10_000;

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

function config(): GoogleConfig | null {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isGoogleEnabled(): boolean {
  return config() !== null;
}

export function callbackUrl(request: Request): string {
  const base = isProduction ? appOrigin() : env.APP_URL?.trim() || new URL(request.url).origin;
  return new URL(GOOGLE_CALLBACK_PATH, base).toString();
}

export interface OAuthStart {
  url: string;
  state: string;
  verifier: string;
  nonce: string;
}

export function authorizationUrl(request: Request): OAuthStart | null {
  const client = config();
  if (!client) return null;

  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', client.clientId);
  url.searchParams.set('redirect_uri', callbackUrl(request));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');

  return { url: url.toString(), state, verifier, nonce };
}

export function secretsMatch(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  first_name: string;
  last_name: string;
}

export async function exchangeCode(
  request: Request,
  code: string,
  verifier: string,
  nonce: string,
): Promise<GoogleProfile | null> {
  const client = config();
  if (!client) return null;

  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
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
      signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
    });
  } catch {
    console.warn('[skyroute] Google code exchange unreachable.');
    return null;
  }

  if (!response.ok) {
    console.warn(`[skyroute] Google code exchange refused (HTTP ${response.status}).`);
    return null;
  }

  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  if (!idToken) return null;

  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: ISSUERS,
      audience: client.clientId,
      maxTokenAge: '10 minutes',
    });

    if (typeof payload.nonce !== 'string' || !secretsMatch(payload.nonce, nonce)) {
      console.warn('[skyroute] Google token rejected: unexpected nonce.');
      return null;
    }

    const email = typeof payload.email === 'string' ? payload.email : null;
    if (!email || typeof payload.sub !== 'string') return null;

    const given = typeof payload.given_name === 'string' ? payload.given_name : '';
    const family = typeof payload.family_name === 'string' ? payload.family_name : '';
    const full = typeof payload.name === 'string' ? payload.name : '';

    return {
      sub: payload.sub,
      email: email.trim().toLowerCase().slice(0, 254),
      email_verified: payload.email_verified === true,
      first_name: (given || full.split(' ')[0] || email.split('@')[0]).slice(0, 60),
      last_name: (family || full.split(' ').slice(1).join(' ') || '—').slice(0, 60),
    };
  } catch (error) {
    console.warn('[skyroute] jeton Google invalide :', error);
    return null;
  }
}
