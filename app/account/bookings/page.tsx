import Link from 'next/link';
import type { Metadata } from 'next';
import { BookingBadge, EmptyState } from '@/components/ui';
import { requireUser } from '@/lib/dal';
import { listUserBookings, type BookingSummary } from '@/lib/queries/bookings';
import { CABIN_LABELS } from '@/lib/types';
import { formatDateTime, formatPrice, parseSqlUtc } from '@/lib/format';

export const metadata: Metadata = {
  title: 'My bookings',
};

function splitByDeparture(bookings: BookingSummary[]) {
  const now = Date.now();
  const isUpcoming = (booking: BookingSummary) =>
    booking.status !== 'cancelled' && parseSqlUtc(booking.departure_utc).getTime() >= now;

  return {
    upcoming: bookings.filter(isUpcoming),
    past: bookings.filter((booking) => !isUpcoming(booking)),
  };
}

function BookingList({ items }: { items: BookingSummary[] }) {
  return (
    <div className="space-y-3">
      {items.map((booking) => (
        <Link
          key={booking.id}
          href={`/booking/${booking.reference}`}
          className="card flex flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:border-brand-400"
        >
          <div>
            <p className="flex items-center gap-2 text-sm">
              <span className="font-mono text-base font-bold tracking-widest">
                {booking.reference}
              </span>
              <BookingBadge status={booking.status} />
            </p>
            <p className="mt-1 text-sm font-medium">
              {booking.origin_city} ({booking.origin_iata}) → {booking.destination_city} (
              {booking.destination_iata})
              {booking.return_flight_id ? ' · round trip' : ''}
            </p>
            <p className="text-xs text-ink-muted">
              {booking.airline_name} · {booking.flight_number} ·{' '}
              {formatDateTime(booking.departure_time)} · {CABIN_LABELS[booking.cabin_class]} ·{' '}
              {booking.passenger_count} passenger{booking.passenger_count > 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{formatPrice(booking.total_price)}</p>
            <p className="text-xs text-brand-600">View ticket →</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function MyBookingsPage() {
  const user = await requireUser('/account/bookings');
  const { upcoming, past } = splitByDeparture(await listUserBookings(user.id));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">
          Upcoming trips{' '}
          <span className="text-sm font-normal text-ink-muted">({upcoming.length})</span>
        </h2>
        <div className="mt-4">
          {upcoming.length === 0 ? (
            <EmptyState
              title="No trips planned"
              description="Search for a flight to plan your next departure."
              action={
                <Link href="/flights" className="btn btn-primary">
                  Search flights
                </Link>
              }
            />
          ) : (
            <BookingList items={upcoming} />
          )}
        </div>
      </section>

      {past.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">
            History <span className="text-sm font-normal text-ink-muted">({past.length})</span>
          </h2>
          <div className="mt-4">
            <BookingList items={past} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
