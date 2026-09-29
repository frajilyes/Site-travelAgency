import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  issueToken,
  sessionCookieOptions,
  shouldRenew,
  verifyToken,
} from './lib/session-token';

const DEVELOPMENT = process.env.NODE_ENV !== 'production';

const PROTECTED = ['/account', '/admin', '/book', '/booking'];
const GUEST_ONLY = ['/login', '/register'];

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    // `https: http: 'unsafe-inline'` are the backward-compatible tail of a strict
    // CSP: a browser that understands nonces ignores 'unsafe-inline', and one that
    // understands 'strict-dynamic' ignores the two schemes. Only a browser too old
    // for either ever sees them, and it would otherwise get no policy it can apply.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${DEVELOPMENT ? " 'unsafe-eval'" : ''} https: http: 'unsafe-inline'`,
    // A nonce in the list makes the browser ignore 'unsafe-inline', so the two
    // cannot be combined: development needs the latter, because Turbopack injects
    // every stylesheet as an un-nonced inline <style> while it hot-reloads.
    `style-src 'self' ${DEVELOPMENT ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    // DOM XSS sinks (innerHTML, script.src, eval) only accept values minted by a
    // policy. The `default` policy created in app/layout.tsx is the only one the
    // page is allowed to declare; it is what rejects a cross-origin script URL.
    "require-trusted-types-for 'script'",
    'trusted-types default',
    ...(DEVELOPMENT ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

function expectedHost(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-host') ?? request.headers.get('host');
}

function crossOriginWrite(request: NextRequest): boolean {
  if (!MUTATING.has(request.method)) return false;

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).host !== expectedHost(request);
    } catch {
      return true;
    }
  }

  const site = request.headers.get('sec-fetch-site');
  return site !== 'same-origin' && site !== 'none';
}

export async function proxy(request: NextRequest) {
  if (crossOriginWrite(request)) {
    return new NextResponse('Request refused: origin not allowed.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const path = request.nextUrl.pathname;

  const session = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session && PROTECTED.some((prefix) => path.startsWith(prefix))) {
    const url = new URL('/login', request.nextUrl);
    url.searchParams.set('next', path + request.nextUrl.search);
    return await withSecurityHeaders(NextResponse.redirect(url), null);
  }

  if (session && GUEST_ONLY.some((prefix) => path.startsWith(prefix))) {
    const home = session.role === 'admin' ? '/admin' : '/account';
    return await withSecurityHeaders(NextResponse.redirect(new URL(home, request.nextUrl)), null);
  }

  if (session?.role !== 'admin' && path.startsWith('/admin')) {
    return await withSecurityHeaders(
      NextResponse.redirect(new URL('/account', request.nextUrl)),
      null,
    );
  }

  const nonce = makeNonce();
  const policy = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);

  return withSecurityHeaders(response, session);
}

type Session = Awaited<ReturnType<typeof verifyToken>>;

async function withSecurityHeaders(
  response: NextResponse,
  session: Session,
): Promise<NextResponse> {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Origin-Agent-Cluster', '?1');
  response.headers.set(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), interest-cohort=()',
  );

  if (!DEVELOPMENT) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  if (session) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  }

  if (session && shouldRenew(session)) {
    await renew(response, session);
  }

  return response;
}

async function renew(response: NextResponse, session: NonNullable<Session>): Promise<void> {
  const { token, expiresAt } = await issueToken({
    userId: session.userId,
    role: session.role,
    version: session.version,
    absoluteExpiry: session.absoluteExpiry,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
