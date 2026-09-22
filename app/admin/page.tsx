import Link from 'next/link';
import type { Metadata } from 'next';
import { BookingBadge, PageHeader, StatCard } from '@/components/ui';
import { dashboardStats, recentBookings, revenueByMonth, topRoutes } from '@/lib/queries/bookings';
import { listAuditLogs } from '@/lib/queries/users';
import { formatDateTime, formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Tableau de bord',
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
        title="Tableau de bord"
        subtitle="Activité commerciale, remplissage et dernières opérations."
        action={
          <Link href="/admin/vols/nouveau" className="btn btn-primary">
            Programmer un vol
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Chiffre d'affaires"
          value={formatPrice(stats.revenue)}
          hint={`Panier moyen ${formatPrice(stats.averageBasket)}`}
        />
        <StatCard
          label="Réservations"
          value={stats.bookings.toLocaleString('fr-FR')}
          hint={`${stats.confirmed} confirmées · ${stats.cancelled} annulées`}
        />
        <StatCard
          label="Passagers transportés"
          value={stats.passengers.toLocaleString('fr-FR')}
          hint="Hors réservations annulées"
        />
        <StatCard
          label="Vols à venir"
          value={stats.upcomingFlights.toLocaleString('fr-FR')}
          hint={`${stats.flights.toLocaleString('fr-FR')} vols au total`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-lg font-semibold">Chiffre d’affaires par mois</h2>
          {months.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Aucune réservation enregistrée.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {months.map((month) => (
                <li key={month.month}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{month.month}</span>
                    <span className="tabular-nums text-ink-muted">
                      {formatPrice(month.total)} · {month.bookings} dossier
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
          <h2 className="text-lg font-semibold">Lignes les plus réservées</h2>
          {routes.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Aucune ligne réservée pour l’instant.</p>
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
          <h2 className="text-lg font-semibold">Dernières réservations</h2>
          <Link href="/admin/reservations" className="text-sm font-medium text-brand-600 hover:underline">
            Tout voir
          </Link>
        </div>

        <div className="table-wrap mt-3">
          <table className="table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Client</th>
                <th>Trajet</th>
                <th>Départ</th>
                <th>Statut</th>
                <th className="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-ink-muted">
                    Aucune réservation.
                  </td>
                </tr>
              ) : (
                recent.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <Link
                        href={`/reservation/${booking.reference}`}
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
          <h2 className="text-lg font-semibold">Dernières opérations</h2>
          <Link href="/admin/journal" className="text-sm font-medium text-brand-600 hover:underline">
            Journal complet
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
                {log.actor ?? 'Système'} · {formatDateTime(log.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
