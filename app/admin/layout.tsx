import Link from 'next/link';
import { requireAdmin } from '@/lib/dal';

const SECTIONS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/flights', label: 'Flights', icon: '✈️' },
  { href: '/admin/bookings', label: 'Bookings', icon: '🎫' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/airports', label: 'Airports', icon: '🛫' },
  { href: '/admin/airlines', label: 'Airlines', icon: '🏷️' },
  { href: '/admin/aircraft', label: 'Fleet', icon: '🛩️' },
  { href: '/admin/countries', label: 'Countries', icon: '🌍' },
  { href: '/admin/audit', label: 'Audit log', icon: '📜' },
];

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto max-w-[110rem] px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-20">
          <div className="card p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Administration
            </p>
            <nav className="flex flex-wrap gap-1 lg:flex-col">
              {SECTIONS.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-muted"
                >
                  <span aria-hidden="true">{section.icon}</span>
                  {section.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 border-t border-line px-2 pt-3 text-xs text-ink-muted">
              Signed in as
              <br />
              <span className="font-medium text-ink">
                {admin.first_name} {admin.last_name}
              </span>
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
