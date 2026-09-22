import { NextResponse, type NextRequest } from 'next/server';
import { decrypt, SESSION_COOKIE } from './lib/session-token';

const PROTECTED = ['/compte', '/admin', '/reserver', '/reservation'];
const GUEST_ONLY = ['/connexion', '/inscription'];

/**
 * Optimistic route protection: it only reads the session cookie, never the
 * database. Pages and Server Actions re-check the user through the data access
 * layer, which is what actually enforces access.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session && PROTECTED.some((prefix) => path.startsWith(prefix))) {
    const url = new URL('/connexion', request.nextUrl);
    url.searchParams.set('next', path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (session && GUEST_ONLY.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.redirect(new URL(session.role === 'admin' ? '/admin' : '/compte', request.nextUrl));
  }

  if (session?.role !== 'admin' && path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/compte', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\.svg$).*)'],
};
