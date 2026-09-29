import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Geist } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { getCurrentUser } from '@/lib/dal';
import { logout } from '@/actions/auth';

// Single family on the critical path: the monospace labels fall back to the
// system stack instead of pulling a second woff2 into the first paint.
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'SkyRoute — International travel agency',
    template: '%s · SkyRoute',
  },
  description:
    'Search, compare and book flights between the world’s major cities: live fares, passenger management, e-tickets and full control over your bookings.',
};

// First script on the page, and the only inline one. It does two things before
// anything else can run:
//
// 1. Installs the `default` Trusted Types policy that `require-trusted-types-for
//    'script'` (see proxy.ts) demands. Neither React nor Turbopack mints trusted
//    values of its own, so without this the chunk loader's `script.src` would
//    throw. `createScriptURL` is the half that carries weight — it is what keeps
//    a DOM sink from pulling code off another origin. Markup and source text are
//    handed back untouched: those sinks belong to the framework's own hydration.
// 2. Applies the stored theme, so the first paint is already the right one.
const BOOTSTRAP_SCRIPT = `(function(){var tt=window.trustedTypes;if(tt&&tt.createPolicy&&!tt.defaultPolicy){try{tt.createPolicy('default',{createScriptURL:function(u){if(new URL(u,document.baseURI).origin!==location.origin)throw new TypeError('Blocked script URL: '+u);return u},createHTML:function(h){return h},createScript:function(s){return s}})}catch(e){}}try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})();`;

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [user, requestHeaders] = await Promise.all([getCurrentUser(), headers()]);
  const nonce = requestHeaders.get('x-nonce') ?? undefined;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader user={user} logoutAction={logout} />
        <main className="flex-1">{children}</main>
        <footer className="below-fold border-t border-line bg-surface-raised">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="flex items-center gap-2 font-bold">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white"
                >
                  ✈
                </span>
                SkyRoute
              </p>
              <p className="mt-3 text-sm text-ink-muted">
                Online travel agency: over 50 airports, 27 partner airlines and flights to 35
                countries.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">Travel</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                <li>
                  <Link href="/flights" className="hover:text-brand-600">
                    Search flights
                  </Link>
                </li>
                <li>
                  <Link href="/destinations" className="hover:text-brand-600">
                    All destinations
                  </Link>
                </li>
                <li>
                  <Link href="/account/bookings" className="hover:text-brand-600">
                    My bookings
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Information</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                <li>
                  <Link href="/help" className="hover:text-brand-600">
                    Help and FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/help/baggage" className="hover:text-brand-600">
                    Baggage
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-brand-600">
                    Terms of sale
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Customer service</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                <li>+33 1 84 88 20 30</li>
                <li>contact@skyroute.fr</li>
                <li>Monday to Saturday, 8 am – 8 pm</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-line">
            <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-ink-muted">
              © {new Date().getFullYear()} SkyRoute — Demonstration project. Flights, fares and
              payments are simulated in a local database.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
