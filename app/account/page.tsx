import type { Metadata } from 'next';
import { PasswordForm, ProfileForm } from '@/components/account-forms';
import { requireUser } from '@/lib/dal';
import { listUserBookings } from '@/lib/queries/bookings';
import { hasPassword } from '@/lib/queries/users';
import { formatDate, formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'My profile',
};

export default async function AccountPage() {
  const user = await requireUser('/account');
  const [bookings, password] = await Promise.all([
    listUserBookings(user.id),
    hasPassword(user.id),
  ]);
  const active = bookings.filter((booking) => booking.status === 'confirmed');
  const spent = active.reduce((sum, booking) => sum + booking.total_price, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Personal details</h2>
          <p className="mt-1 text-sm text-ink-muted">
            These details are pre-filled when you make a booking.
          </p>
          <div className="mt-4">
            <ProfileForm user={user} />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold">Security</h2>
          {password ? (
            <>
              <p className="mt-1 text-sm text-ink-muted">
                Choose a password of at least 12 characters, including a lowercase letter, an uppercase letter and a digit.
              </p>
              <div className="mt-4">
                <PasswordForm />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              This account signs in with Google, so there is no password to manage here. Access
              security is handled by your Google account.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Your activity
          </h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Bookings</dt>
              <dd className="font-semibold tabular-nums">{bookings.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Confirmed trips</dt>
              <dd className="font-semibold tabular-nums">{active.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Total paid</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(spent)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Member since</dt>
              <dd className="font-semibold">{formatDate(user.created_at)}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  );
}
