import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton, StatusSelect } from '@/components/action-button';
import { BookingBadge, PageHeader, Pagination } from '@/components/ui';
import { changeBookingStatus } from '@/actions/admin';
import { cancel } from '@/actions/booking';
import { listBookings } from '@/lib/queries/bookings';
import { CABIN_LABELS, type BookingStatus } from '@/lib/types';
import { formatDateTime, formatPrice } from '@/lib/format';

export const metadata: Metadata = { title: 'Bookings' };

const PER_PAGE = 20;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
];

const KNOWN_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed'];

export default async function AdminBookingsPage(props: PageProps<'/admin/bookings'>) {
  const params = await props.searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const search = read('q');
  const rawStatus = read('status') as BookingStatus | undefined;
  const status = rawStatus && KNOWN_STATUSES.includes(rawStatus) ? rawStatus : undefined;
  const page = Math.max(1, Number(read('page')) || 1);

  const { rows, total } = await listBookings({ search, status, page, perPage: PER_PAGE });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle={`${total.toLocaleString('en-GB')} booking${total > 1 ? 's' : ''}`}
      />

      <form method="get" action="/admin/bookings" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="w-full sm:w-72">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            className="field"
            defaultValue={search ?? ''}
            placeholder="Reference, email, name, flight number"
          />
        </div>
        <div className="w-full sm:w-52">
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="field" defaultValue={status ?? ''}>
            <option value="">All</option>
            <option value="pending">Awaiting payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Filter
        </button>
        <Link href="/admin/bookings" className="btn btn-ghost">
          Reset
        </Link>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Route</th>
              <th>Departure</th>
              <th>Cabin</th>
              <th>Passengers</th>
              <th>Amount</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-ink-muted">
                  No booking matches these filters.
                </td>
              </tr>
            ) : (
              rows.map((booking) => (
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
                        label="Cancel"
                        variant="danger"
                        confirmText={`Cancel booking ${booking.reference}? The seats will be put back on sale and the refund calculated under the terms of sale.`}
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
        basePath="/admin/bookings"
        params={{ q: search, status }}
      />
    </div>
  );
}
