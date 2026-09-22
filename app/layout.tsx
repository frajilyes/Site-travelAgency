import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { getCurrentUser } from '@/lib/dal';
import { logout } from '@/actions/auth';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'SkyRoute — Agence de voyages internationale',
    template: '%s · SkyRoute',
  },
  description:
    'Recherchez, comparez et réservez des vols entre les grandes villes du monde : tarifs en temps réel, gestion des passagers, billets électroniques et suivi de vos réservations.',
};

/** Applies the stored theme before first paint so there is no flash. */
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();

  return (
    // The inline script below sets the `dark` class before React hydrates, so the
    // server markup and the client tree differ by design on <html>.
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader user={user} logoutAction={logout} />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-surface-raised">
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
                Agence de voyages en ligne : plus de 50 aéroports, 27 compagnies partenaires et des
                vols vers 35 pays.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">Voyager</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                <li>
                  <Link href="/vols" className="hover:text-brand-600">
                    Rechercher un vol
                  </Link>
                </li>
                <li>
                  <Link href="/destinations" className="hover:text-brand-600">
                    Toutes les destinations
                  </Link>
                </li>
                <li>
                  <Link href="/compte/reservations" className="hover:text-brand-600">
                    Mes réservations
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Informations</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                <li>
                  <Link href="/aide" className="hover:text-brand-600">
                    Aide et FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/aide/bagages" className="hover:text-brand-600">
                    Bagages
                  </Link>
                </li>
                <li>
                  <Link href="/conditions" className="hover:text-brand-600">
                    Conditions de vente
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Service client</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                <li>+33 1 84 88 20 30</li>
                <li>contact@skyroute.fr</li>
                <li>Du lundi au samedi, 8 h – 20 h</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-line">
            <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-ink-muted">
              © {new Date().getFullYear()} SkyRoute — Projet de démonstration. Les vols, tarifs et
              paiements sont simulés dans une base de données locale.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
