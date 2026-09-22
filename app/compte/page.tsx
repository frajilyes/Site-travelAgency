import type { Metadata } from 'next';
import { PasswordForm, ProfileForm } from '@/components/account-forms';
import { requireUser } from '@/lib/dal';
import { listUserBookings } from '@/lib/queries/bookings';
import { hasPassword } from '@/lib/queries/users';
import { formatDate, formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Mon profil',
};

export default async function AccountPage() {
  const user = await requireUser('/compte');
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
          <h2 className="text-lg font-semibold">Informations personnelles</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Ces coordonnées sont pré-remplies lors de vos réservations.
          </p>
          <div className="mt-4">
            <ProfileForm user={user} />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold">Sécurité</h2>
          {password ? (
            <>
              <p className="mt-1 text-sm text-ink-muted">
                Choisissez un mot de passe d’au moins 8 caractères, avec une lettre et un chiffre.
              </p>
              <div className="mt-4">
                <PasswordForm />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              Ce compte se connecte avec Google : il n’a pas de mot de passe à gérer ici. La
              sécurité de l’accès dépend de votre compte Google.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Votre activité
          </h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Réservations</dt>
              <dd className="font-semibold tabular-nums">{bookings.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Voyages confirmés</dt>
              <dd className="font-semibold tabular-nums">{active.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Total réglé</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(spent)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Membre depuis</dt>
              <dd className="font-semibold">{formatDate(user.created_at)}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  );
}
