import Link from 'next/link';
import { requireUser } from '@/lib/dal';

export default async function AccountLayout({ children }: LayoutProps<'/compte'>) {
  const user = await requireUser('/compte');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour {user.first_name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{user.email}</p>
        </div>
        {user.role === 'admin' ? (
          <Link href="/admin" className="btn btn-ghost">
            Espace administration
          </Link>
        ) : null}
      </header>

      <nav className="mt-6 flex gap-2 border-b border-line pb-3">
        <Link href="/compte" className="btn btn-ghost">
          Mon profil
        </Link>
        <Link href="/compte/reservations" className="btn btn-ghost">
          Mes réservations
        </Link>
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
