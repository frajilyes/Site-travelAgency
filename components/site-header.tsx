'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from './theme-toggle';
import type { PublicUser } from '@/lib/types';

const LINKS = [
  { href: '/vols', label: 'Rechercher un vol' },
  { href: '/destinations', label: 'Destinations' },
  { href: '/aide', label: 'Aide' },
];

export function SiteHeader({
  user,
  logoutAction,
}: {
  user: PublicUser | null;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  // Remembering which page the menu was opened on closes it on navigation.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface-raised/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"
          >
            ✈
          </span>
          <span className="text-lg">SkyRoute</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-muted ${
                pathname.startsWith(link.href) ? 'text-brand-600 dark:text-brand-300' : 'text-ink'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <Link href="/admin" className="btn btn-ghost">
                    Administration
                  </Link>
                ) : null}
                <Link href="/compte" className="btn btn-ghost">
                  {user.first_name}
                </Link>
                <form action={logoutAction}>
                  <button type="submit" className="btn btn-ghost">
                    Déconnexion
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/connexion" className="btn btn-ghost">
                  Connexion
                </Link>
                <Link href="/inscription" className="btn btn-primary">
                  Créer un compte
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="btn btn-ghost px-2.5 md:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpenedOn(open ? null : pathname)}
          >
            <span aria-hidden="true">{open ? '✕' : '☰'}</span>
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>

      {open ? (
        <div id="menu-mobile" className="border-t border-line px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-muted"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-line" />
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-muted">
                    Administration
                  </Link>
                ) : null}
                <Link href="/compte" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-muted">
                  Mon compte
                </Link>
                <Link
                  href="/compte/reservations"
                  className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-muted"
                >
                  Mes réservations
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted"
                  >
                    Déconnexion
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/connexion" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-muted">
                  Connexion
                </Link>
                <Link href="/inscription" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-muted">
                  Créer un compte
                </Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
