import Link from 'next/link';
import type { Metadata } from 'next';
import { BookingBadge, PageHeader, StatCard } from '@/components/ui';
import { dashboardStats, recentBookings, revenueByMonth, topRoutes } from '@/lib/queries/bookings';
import { listAuditLogs } from '@/lib/queries/users';
import { formatDateTime, formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function AdminDashboardPage() {
  const [stats, months, routes, recent, logs] = await Promise.all([
    dashboardStats(),
    revenueByMonth(6),
    topRoutes(6),
    recentBookings(8),
    listAuditLogs(6),
  ]);

  const maxRevenue = Math.max(1, ...months.map((month) => month.total));
  const maxRouteBookings = Math.max(1, ...routes.map((route) => route.bookings));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Commercial activity, load factor and the latest operations."
        action={
          <Link href="/admin/flights/new" className="btn btn-primary">
            Schedule a flight
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatPrice(stats.revenue)}
          hint={`Average basket ${formatPrice(stats.averageBasket)}`}
        />
        <StatCard
          label="Bookings"
          value={stats.bookings.toLocaleString('en-GB')}
          hint={`${stats.confirmed} confirmed · ${stats.cancelled} cancelled`}
        />
        <StatCard
          label="Passengers carried"
          value={stats.passengers.toLocaleString('en-GB')}
          hint="Excluding cancelled bookings"
        />
        <StatCard
          label="Upcoming flights"
          value={stats.upcomingFlights.toLocaleString('en-GB')}
          hint={`${stats.flights.toLocaleString('en-GB')} flights in total`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-lg font-semibold">Revenue by month</h2>
          {months.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No bookings recorded.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {months.map((month) => (
                <li key={month.month}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{month.month}</span>
                    <span className="tabular-nums text-ink-muted">
                      {formatPrice(month.total)} · {month.bookings} booking
                      {month.bookings > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface-muted">
                    <div
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width: `${Math.max(4, (month.total / maxRevenue) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-semibold">Most booked routes</h2>
          {routes.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No route booked yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {routes.map((route) => (
                <li key={route.route}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono font-medium">{route.route}</span>
                    <span className="tabular-nums text-ink-muted">
                      {route.bookings} · {formatPrice(route.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface-muted">
                    <div
                      className="h-2 rounded-full bg-accent-500"
                      style={{
                        width: `${Math.max(4, (route.bookings / maxRouteBookings) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest bookings</h2>
          <Link href="/admin/bookings" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>

        <div className="table-wrap mt-3">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Departure</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-ink-muted">
                    No bookings.
                  </td>
                </tr>
              ) : (
                recent.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <Link
                        href={`/booking/${booking.reference}`}
                        className="font-mono font-semibold text-brand-600 hover:underline"
                      >
                        {booking.reference}
                      </Link>
                    </td>
                    <td>
                      <p className="font-medium">{booking.customer_name}</p>
                      <p className="text-xs text-ink-muted">{booking.customer_email}</p>
                    </td>
                    <td className="font-mono text-xs">
                      {booking.origin_iata} → {booking.destination_iata}
                    </td>
                    <td className="text-xs">{formatDateTime(booking.departure_time)}</td>
                    <td>
                      <BookingBadge status={booking.status} />
                    </td>
                    <td className="text-right tabular-nums">{formatPrice(booking.total_price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest operations</h2>
          <Link href="/admin/audit" className="text-sm font-medium text-brand-600 hover:underline">
            Full audit log
          </Link>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {logs.map((log) => (
            <li key={log.id} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2 last:border-b-0">
              <span>
                <span className="badge font-mono">{log.action}</span>{' '}
                <span className="text-ink-muted">{log.details}</span>
              </span>
              <span className="text-xs text-ink-muted">
                {log.actor ?? 'System'} · {formatDateTime(log.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
