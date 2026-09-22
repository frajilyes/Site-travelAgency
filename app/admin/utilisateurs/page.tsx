import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/ui';
import { removeUser, toggleUserStatus } from '@/actions/admin';
import { listUsers } from '@/lib/queries/users';
import { formatDate, formatPrice } from '@/lib/format';
import type { Role, UserStatus } from '@/lib/types';

export const metadata: Metadata = { title: 'Utilisateurs' };

export default async function AdminUsersPage(props: PageProps<'/admin/utilisateurs'>) {
  const params = await props.searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const search = read('q');
  const role = read('role') as Role | undefined;
  const status = read('statut') as UserStatus | undefined;

  const users = await listUsers({
    search,
    role: role === 'admin' || role === 'user' ? role : undefined,
    status: status === 'active' || status === 'suspended' ? status : undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users.length} compte${users.length > 1 ? 's' : ''}`}
        action={
          <Link href="/admin/utilisateurs/nouveau" className="btn btn-primary">
            Créer un compte
          </Link>
        }
      />

      <form method="get" action="/admin/utilisateurs" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="w-full sm:w-64">
          <label className="label" htmlFor="q">
            Recherche
          </label>
          <input id="q" name="q" className="field" defaultValue={search ?? ''} placeholder="Nom ou e-mail" />
        </div>
        <div className="w-full sm:w-40">
          <label className="label" htmlFor="role">
            Rôle
          </label>
          <select id="role" name="role" className="field" defaultValue={role ?? ''}>
            <option value="">Tous</option>
            <option value="user">Client</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label className="label" htmlFor="statut">
            Statut
          </label>
          <select id="statut" name="statut" className="field" defaultValue={status ?? ''}>
            <option value="">Tous</option>
            <option value="active">Actif</option>
            <option value="suspended">Suspendu</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Filtrer
        </button>
        <Link href="/admin/utilisateurs" className="btn btn-ghost">
          Réinitialiser
        </Link>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>E-mail</th>
              <th>Téléphone</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Réservations</th>
              <th>Total dépensé</th>
              <th>Inscrit le</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-ink-muted">
                  Aucun compte ne correspond à ces critères.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="text-xs">{user.email}</td>
                  <td className="text-xs">{user.phone ?? '—'}</td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-info' : ''}`}>
                      {user.role === 'admin' ? 'Administrateur' : 'Client'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {user.status === 'active' ? 'Actif' : 'Suspendu'}
                    </span>
                  </td>
                  <td className="tabular-nums">{user.bookings}</td>
                  <td className="tabular-nums">{formatPrice(user.spent)}</td>
                  <td className="text-xs">{formatDate(user.created_at)}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/utilisateurs/${user.id}`} className="btn btn-ghost px-2 py-1 text-xs">
                        Modifier
                      </Link>
                      <ActionButton
                        action={toggleUserStatus}
                        fields={{ id: user.id }}
                        label={user.status === 'active' ? 'Suspendre' : 'Réactiver'}
                        variant="ghost"
                      />
                      <ActionButton
                        action={removeUser}
                        fields={{ id: user.id }}
                        label="Supprimer"
                        variant="danger"
                        confirmText={`Supprimer le compte ${user.email} et toutes ses réservations ?`}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
