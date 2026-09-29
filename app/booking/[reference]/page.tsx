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
  title: 'Your booking',
};

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
          <dt className="text-xs text-ink-muted">Airline</dt>
          <dd className="font-medium">{flight.airline_name}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Aircraft</dt>
          <dd className="font-medium">
            {flight.aircraft_manufacturer} {flight.aircraft_model}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Cabin</dt>
          <dd className="font-medium">{CABIN_LABELS[cabin]}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Seats</dt>
          <dd className="font-medium font-mono">
            {seats.filter(Boolean).join(', ') || 'On lap'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Departure terminal</dt>
          <dd className="font-medium">{flight.origin_name}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Arrival</dt>
          <dd className="font-medium">{flight.destination_name}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Checked baggage</dt>
          <dd className="font-medium">{flight.baggage_kg} kg per passenger</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Check-in</dt>
          <dd className="font-medium">Closes 45 min before departure</dd>
        </div>
      </dl>
    </section>
  );
}

export default async function BookingDetailPage(props: PageProps<'/booking/[reference]'>) {
  const { reference } = await props.params;
  const user = await requireUser(`/booking/${reference}`);
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
        <Link href="/account/bookings" className="hover:text-brand-600">
          My bookings
        </Link>{' '}
        / {booking.reference}
      </nav>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Booking reference
          </p>
          <h1 className="font-mono text-3xl font-bold tracking-widest">{booking.reference}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
            <BookingBadge status={booking.status} />
            Booked on {formatDateTime(booking.created_at)}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <PrintButton />
          <Link href="/flights" className="btn btn-primary">
            Book another flight
          </Link>
        </div>
      </header>

      {booking.status === 'cancelled' ? (
        <div className="mt-6">
          <Alert tone="error">
            This booking was cancelled
            {booking.cancelled_at ? ` on ${formatDateTime(booking.cancelled_at)}` : ''}.
            {refunded > 0 ? ` A refund of ${formatPrice(refunded)} has been recorded.` : ''}
          </Alert>
        </div>
      ) : (
        <div className="mt-6">
          <Alert tone="success">
            Your booking is confirmed. Present this reference and photo ID at check-in. A
            confirmation email has been sent to <strong>{booking.contact_email}</strong> — if it is
            not in your inbox, check your junk mail (spam) folder.
          </Alert>
        </div>
      )}

      <div className="mt-6 space-y-6">
        <Segment
          flight={booking.outbound}
          cabin={booking.cabin_class}
          label="Outbound flight"
          seats={booking.passengers.map((passenger) => passenger.seat_outbound)}
        />
        {booking.returnFlight ? (
          <Segment
            flight={booking.returnFlight}
            cabin={booking.cabin_class}
            label="Return flight"
            seats={booking.passengers.map((passenger) => passenger.seat_return)}
          />
        ) : null}

        <section className="card p-5">
          <h2 className="text-lg font-semibold">
            Passengers ({booking.passengers.length})
          </h2>
          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Date of birth</th>
                  <th>Nationality</th>
                  <th>Passport</th>
                  <th>Outbound seat</th>
                  {booking.returnFlight ? <th>Return seat</th> : null}
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
                        ? 'Adult'
                        : passenger.passenger_type === 'child'
                          ? 'Child'
                          : 'Infant'}
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
          <h2 className="text-lg font-semibold">Payment</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Flight fares</dt>
              <dd className="tabular-nums">{formatPrice(booking.base_price)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Taxes and charges</dt>
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
                  <th>Method</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {booking.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="font-mono text-xs">{payment.transaction_ref}</td>
                    <td>{formatDateTime(payment.created_at)}</td>
                    <td>
                      {payment.method === 'card'
                        ? `Card ••••${payment.card_last4 ?? '????'}`
                        : payment.method === 'paypal'
                          ? 'PayPal'
                          : 'Bank transfer'}
                    </td>
                    <td>
                      <span
                        className={`badge ${payment.status === 'paid' ? 'badge-success' : payment.status === 'refunded' ? 'badge-info' : 'badge-warning'}`}
                      >
                        {payment.status === 'paid'
                          ? 'Paid'
                          : payment.status === 'refunded'
                            ? 'Refunded'
                            : payment.status === 'pending'
                              ? 'Pending'
                              : 'Failed'}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{formatPrice(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Collected: {formatPrice(paid)}
            {refunded > 0 ? ` · refunded: ${formatPrice(refunded)}` : ''}
          </p>
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-semibold">Booking contact</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {booking.contact_email} · {booking.contact_phone}
          </p>

          {canCancel ? (
            <div className="mt-4 border-t border-line pt-4 print:hidden">
              <p className="text-sm text-ink-muted">
                {rate === 1
                  ? 'Cancellation is free: departure is more than 7 days away.'
                  : rate === 0.5
                    ? 'You can cancel with a 50% refund (departure is less than 7 days away).'
                    : 'Departure is less than 24 hours away, so cancelling no longer qualifies for a refund.'}
              </p>
              <div className="mt-3">
                <ActionButton
                  action={cancel}
                  fields={{ booking_id: booking.id }}
                  label="Cancel booking"
                  pendingLabel="Cancelling…"
                  variant="danger"
                  confirmText={`Permanently cancel booking ${booking.reference}? Estimated refund: ${formatPrice(booking.total_price * rate)}.`}
                />
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
