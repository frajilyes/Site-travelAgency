import Link from 'next/link';
import { requireUser } from '@/lib/dal';

export default async function AccountLayout({ children }: LayoutProps<'/account'>) {
  const user = await requireUser('/account');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hello {user.first_name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{user.email}</p>
        </div>
        {user.role === 'admin' ? (
          <Link href="/admin" className="btn btn-ghost">
            Admin area
          </Link>
        ) : null}
      </header>

      <nav className="mt-6 flex gap-2 border-b border-line pb-3">
        <Link href="/account" className="btn btn-ghost">
          My profile
        </Link>
        <Link href="/account/bookings" className="btn btn-ghost">
          My bookings
        </Link>
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
