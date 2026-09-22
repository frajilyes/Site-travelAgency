import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton, StatusSelect } from '@/components/action-button';
import { BookingBadge, PageHeader, Pagination } from '@/components/ui';
import { changeBookingStatus } from '@/actions/admin';
import { cancel } from '@/actions/booking';
import { listBookings } from '@/lib/queries/bookings';
import { CABIN_LABELS, type BookingStatus } from '@/lib/types';
import { formatDateTime, formatPrice } from '@/lib/format';

export const metadata: Metadata = { title: 'Réservations' };

const PER_PAGE = 20;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente de paiement' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'completed', label: 'Terminée' },
];

const KNOWN_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed'];

export default async function AdminBookingsPage(props: PageProps<'/admin/reservations'>) {
  const params = await props.searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const search = read('q');
  const rawStatus = read('statut') as BookingStatus | undefined;
  const status = rawStatus && KNOWN_STATUSES.includes(rawStatus) ? rawStatus : undefined;
  const page = Math.max(1, Number(read('page')) || 1);

  const { rows, total } = await listBookings({ search, status, page, perPage: PER_PAGE });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réservations"
        subtitle={`${total.toLocaleString('fr-FR')} dossier${total > 1 ? 's' : ''}`}
      />

      <form method="get" action="/admin/reservations" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="w-full sm:w-72">
          <label className="label" htmlFor="q">
            Recherche
          </label>
          <input
            id="q"
            name="q"
            className="field"
            defaultValue={search ?? ''}
            placeholder="Référence, e-mail, nom, numéro de vol"
          />
        </div>
        <div className="w-full sm:w-52">
          <label className="label" htmlFor="statut">
            Statut
          </label>
          <select id="statut" name="statut" className="field" defaultValue={status ?? ''}>
            <option value="">Tous</option>
            <option value="pending">En attente de paiement</option>
            <option value="confirmed">Confirmée</option>
            <option value="completed">Terminée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Filtrer
        </button>
        <Link href="/admin/reservations" className="btn btn-ghost">
          Réinitialiser
        </Link>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Client</th>
              <th>Trajet</th>
              <th>Départ</th>
              <th>Cabine</th>
              <th>Passagers</th>
              <th>Montant</th>
              <th>Statut</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-ink-muted">
                  Aucune réservation ne correspond à ces critères.
                </td>
              </tr>
            ) : (
              rows.map((booking) => (
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
                  <td className="text-xs">
                    <p className="font-mono font-semibold">
                      {booking.origin_iata} → {booking.destination_iata}
                      {booking.return_flight_id ? ' ⇄' : ''}
                    </p>
                    <p className="text-ink-muted">{booking.flight_number}</p>
                  </td>
                  <td className="text-xs">{formatDateTime(booking.departure_time)}</td>
                  <td className="text-xs">{CABIN_LABELS[booking.cabin_class]}</td>
                  <td className="tabular-nums">{booking.passenger_count}</td>
                  <td className="tabular-nums">{formatPrice(booking.total_price)}</td>
                  <td>
                    {booking.status === 'cancelled' ? (
                      <BookingBadge status={booking.status} />
                    ) : (
                      <StatusSelect
                        action={changeBookingStatus}
                        fields={{ id: booking.id }}
                        name="status"
                        value={booking.status}
                        options={STATUS_OPTIONS}
                      />
                    )}
                  </td>
                  <td>
                    {booking.status !== 'cancelled' && booking.status !== 'completed' ? (
                      <ActionButton
                        action={cancel}
                        fields={{ booking_id: booking.id }}
                        label="Annuler"
                        variant="danger"
                        confirmText={`Annuler la réservation ${booking.reference} ? Les sièges seront remis en vente et le remboursement calculé selon les conditions de vente.`}
                      />
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        perPage={PER_PAGE}
        total={total}
        basePath="/admin/reservations"
        params={{ q: search, statut: status }}
      />
    </div>
  );
}
