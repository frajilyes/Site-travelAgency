import Link from 'next/link';
import { HEADER_LINKS } from './header-links';
import { HeaderNav } from './header-nav';
import { HeaderShell } from './header-shell';
import { ThemeToggle } from './theme-toggle';
import type { PublicUser } from '@/lib/types';

export function SiteHeader({
  user,
  logoutAction,
}: {
  user: PublicUser | null;
  logoutAction: () => Promise<void>;
}) {
  const bar = (
    <>
      <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
        <span
          aria-hidden="true"
          className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"
        >
          ✈
        </span>
        <span className="text-lg">SkyRoute</span>
      </Link>

      <HeaderNav />

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {user.role === 'admin' ? (
                <Link href="/admin" className="btn btn-ghost">
                  Admin
                </Link>
              ) : null}
              <Link href="/account" className="btn btn-ghost">
                {user.first_name}
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="btn btn-ghost">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );

  const panel = (
    <nav className="flex flex-col gap-1">
      {HEADER_LINKS.map((link) => (
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
              Admin
            </Link>
          ) : null}
          <Link href="/account" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-muted">
            My account
          </Link>
          <Link
            href="/account/bookings"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            My bookings
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted"
            >
              Sign out
            </button>
          </form>
        </>
      ) : (
        <>
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-muted">
            Sign in
          </Link>
          <Link href="/register" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-muted">
            Create account
          </Link>
        </>
      )}
    </nav>
  );

  return <HeaderShell bar={bar} panel={panel} />;
}
