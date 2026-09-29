import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { userFields } from '@/components/admin-fields';
import { BookingBadge, PageHeader } from '@/components/ui';
import { saveUser } from '@/actions/admin';
import { getUser } from '@/lib/queries/users';
import { listUserBookings } from '@/lib/queries/bookings';
import { formatDate, formatDateTime, formatPrice } from '@/lib/format';

export const metadata: Metadata = { title: 'Edit account' };

export default async function EditUserPage(props: PageProps<'/admin/users/[id]'>) {
  const { id } = await props.params;
  const [user, bookings] = await Promise.all([
    getUser(Number(id)),
    listUserBookings(Number(id)),
  ]);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${user.first_name} ${user.last_name}`}
        subtitle={`${user.email} · registered ${formatDate(user.created_at)}`}
      />

      <div className="card p-6">
        <EntityForm
          action={saveUser}
          id={user.id}
          fields={userFields(false)}
          defaults={{
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
          }}
          submitLabel="Save"
          cancelHref="/admin/users"
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold">
          Bookings <span className="text-sm font-normal text-ink-muted">({bookings.length})</span>
        </h2>
        <div className="table-wrap mt-3">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Route</th>
                <th>Departure</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-muted">
                    No bookings.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <Link
                        href={`/booking/${booking.reference}`}
                        className="font-mono font-semibold text-brand-600 hover:underline"
                      >
                        {booking.reference}
                      </Link>
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
    </div>
  );
}
