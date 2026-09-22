import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ActionButton } from '@/components/action-button';
import { PrintButton } from '@/components/print-button';
import { FlightTimeline } from '@/components/flight-card';
import { Alert, BookingBadge } from '@/components/ui';
import { cancel } from '@/actions/booking';
import { requireUser } from '@/lib/dal';
import { getBookingByReference } from '@/lib/queries/bookings';
import { refundRate } from '@/lib/pricing';
import { CABIN_LABELS, type CabinClass, type FlightDetail } from '@/lib/types';
import { formatDateTime, formatLongDate, formatPrice, parseSqlUtc } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Votre réservation',
};

/** Whether a departure is already in the past, read outside the render body. */
function hasDeparted(departureUtc: string): boolean {
  return parseSqlUtc(departureUtc).getTime() < Date.now();
}

function Segment({
  flight,
  cabin,
  label,
  seats,
}: {
  flight: FlightDetail;
  cabin: CabinClass;
  label: string;
  seats: (string | null)[];
}) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{label}</h2>
        <span className="badge badge-info font-mono">{flight.flight_number}</span>
      </div>

      <p className="mt-2 text-lg font-semibold">
        {flight.origin_city} → {flight.destination_city}
      </p>
      <p className="text-sm text-ink-muted">{formatLongDate(flight.departure_time)}</p>

      <div className="mt-4">
        <FlightTimeline flight={flight} />
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-ink-muted">Compagnie</dt>
          <dd className="font-medium">{flight.airline_name}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Appareil</dt>
          <dd className="font-medium">
            {flight.aircraft_manufacturer} {flight.aircraft_model}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Cabine</dt>
          <dd className="font-medium">{CABIN_LABELS[cabin]}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Sièges</dt>
          <dd className="font-medium font-mono">
            {seats.filter(Boolean).join(', ') || 'Sur les genoux'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Terminal de départ</dt>
          <dd className="font-medium">{flight.origin_name}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Arrivée</dt>
          <dd className="font-medium">{flight.destination_name}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Bagage en soute</dt>
          <dd className="font-medium">{flight.baggage_kg} kg par passager</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Enregistrement</dt>
          <dd className="font-medium">Ferme 45 min avant le départ</dd>
        </div>
      </dl>
    </section>
  );
}

export default async function BookingDetailPage(props: PageProps<'/reservation/[reference]'>) {
  const { reference } = await props.params;
  const user = await requireUser(`/reservation/${reference}`);
  const booking = await getBookingByReference(reference.toUpperCase());

  if (!booking) notFound();
  if (booking.user_id !== user.id && user.role !== 'admin') notFound();

  const rate = refundRate(booking.outbound.departure_utc);
  const departed = hasDeparted(booking.outbound.departure_utc);
  const canCancel = booking.status !== 'cancelled' && booking.status !== 'completed' && !departed;
  const paid = booking.payments
    .filter((payment) => payment.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = booking.payments
    .filter((payment) => payment.status === 'refunded')
    .reduce((sum, payment) => sum + Math.abs(payment.amount), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="text-sm text-ink-muted print:hidden">
        <Link href="/compte/reservations" className="hover:text-brand-600">
          Mes réservations
        </Link>{' '}
        / {booking.reference}
      </nav>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Référence de dossier
          </p>
          <h1 className="font-mono text-3xl font-bold tracking-widest">{booking.reference}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
            <BookingBadge status={booking.status} />
            Réservé le {formatDateTime(booking.created_at)}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <PrintButton />
          <Link href="/vols" className="btn btn-primary">
            Réserver un autre vol
          </Link>
        </div>
      </header>

      {booking.status === 'cancelled' ? (
        <div className="mt-6">
          <Alert tone="error">
            Cette réservation a été annulée
            {booking.cancelled_at ? ` le ${formatDateTime(booking.cancelled_at)}` : ''}.
            {refunded > 0 ? ` Un remboursement de ${formatPrice(refunded)} a été enregistré.` : ''}
          </Alert>
        </div>
      ) : (
        <div className="mt-6">
          <Alert tone="success">
            Votre réservation est confirmée. Présentez cette référence et une pièce d’identité à
            l’enregistrement. Un email de confirmation a été envoyé à{' '}
            <strong>{booking.contact_email}</strong> — s’il n’apparaît pas dans votre boîte de
            réception, regardez dans vos courriers indésirables (spam).
          </Alert>
        </div>
      )}

      <div className="mt-6 space-y-6">
        <Segment
          flight={booking.outbound}
          cabin={booking.cabin_class}
          label="Vol aller"
          seats={booking.passengers.map((passenger) => passenger.seat_outbound)}
        />
        {booking.returnFlight ? (
          <Segment
            flight={booking.returnFlight}
            cabin={booking.cabin_class}
            label="Vol retour"
            seats={booking.passengers.map((passenger) => passenger.seat_return)}
          />
        ) : null}

        <section className="card p-5">
          <h2 className="text-lg font-semibold">
            Passagers ({booking.passengers.length})
          </h2>
          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Naissance</th>
                  <th>Nationalité</th>
                  <th>Passeport</th>
                  <th>Siège aller</th>
                  {booking.returnFlight ? <th>Siège retour</th> : null}
                </tr>
              </thead>
              <tbody>
                {booking.passengers.map((passenger) => (
                  <tr key={passenger.id}>
                    <td className="font-medium">
                      {passenger.last_name.toUpperCase()} {passenger.first_name}
                    </td>
                    <td>
                      {passenger.passenger_type === 'adult'
                        ? 'Adulte'
                        : passenger.passenger_type === 'child'
                          ? 'Enfant'
                          : 'Bébé'}
                    </td>
                    <td className="tabular-nums">{passenger.date_of_birth}</td>
                    <td>{passenger.nationality}</td>
                    <td className="font-mono text-xs">{passenger.passport_number}</td>
                    <td className="font-mono">{passenger.seat_outbound ?? '—'}</td>
                    {booking.returnFlight ? (
                      <td className="font-mono">{passenger.seat_return ?? '—'}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-semibold">Paiement</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Tarif des vols</dt>
              <dd className="tabular-nums">{formatPrice(booking.base_price)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Taxes et redevances</dt>
              <dd className="tabular-nums">{formatPrice(booking.taxes)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(booking.total_price)}</dd>
            </div>
          </dl>

          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Moyen</th>
                  <th>Statut</th>
                  <th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {booking.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="font-mono text-xs">{payment.transaction_ref}</td>
                    <td>{formatDateTime(payment.created_at)}</td>
                    <td>
                      {payment.method === 'card'
                        ? `Carte ••••${payment.card_last4 ?? '????'}`
                        : payment.method === 'paypal'
                          ? 'PayPal'
                          : 'Virement'}
                    </td>
                    <td>
                      <span
                        className={`badge ${payment.status === 'paid' ? 'badge-success' : payment.status === 'refunded' ? 'badge-info' : 'badge-warning'}`}
                      >
                        {payment.status === 'paid'
                          ? 'Payé'
                          : payment.status === 'refunded'
                            ? 'Remboursé'
                            : payment.status === 'pending'
                              ? 'En attente'
                              : 'Échoué'}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{formatPrice(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Encaissé : {formatPrice(paid)}
            {refunded > 0 ? ` · remboursé : ${formatPrice(refunded)}` : ''}
          </p>
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-semibold">Contact du dossier</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {booking.contact_email} · {booking.contact_phone}
          </p>

          {canCancel ? (
            <div className="mt-4 border-t border-line pt-4 print:hidden">
              <p className="text-sm text-ink-muted">
                {rate === 1
                  ? 'Annulation gratuite : le départ a lieu dans plus de 7 jours.'
                  : rate === 0.5
                    ? 'Annulation possible avec 50 % de remboursement (départ dans moins de 7 jours).'
                    : 'Le départ a lieu dans moins de 24 heures : l’annulation n’ouvre plus droit à remboursement.'}
              </p>
              <div className="mt-3">
                <ActionButton
                  action={cancel}
                  fields={{ booking_id: booking.id }}
                  label="Annuler la réservation"
                  pendingLabel="Annulation…"
                  variant="danger"
                  confirmText={`Annuler définitivement la réservation ${booking.reference} ? Remboursement estimé : ${formatPrice(booking.total_price * rate)}.`}
                />
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
