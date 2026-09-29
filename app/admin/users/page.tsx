import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/ui';
import { removeUser, toggleUserStatus } from '@/actions/admin';
import { listUsers } from '@/lib/queries/users';
import { formatDate, formatPrice } from '@/lib/format';
import type { Role, UserStatus } from '@/lib/types';

export const metadata: Metadata = { title: 'Users' };

export default async function AdminUsersPage(props: PageProps<'/admin/users'>) {
  const params = await props.searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const search = read('q');
  const role = read('role') as Role | undefined;
  const status = read('status') as UserStatus | undefined;

  const users = await listUsers({
    search,
    role: role === 'admin' || role === 'user' ? role : undefined,
    status: status === 'active' || status === 'suspended' ? status : undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle={`${users.length} account${users.length > 1 ? 's' : ''}`}
        action={
          <Link href="/admin/users/new" className="btn btn-primary">
            Create account
          </Link>
        }
      />

      <form method="get" action="/admin/users" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="w-full sm:w-64">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" className="field" defaultValue={search ?? ''} placeholder="Name or email" />
        </div>
        <div className="w-full sm:w-40">
          <label className="label" htmlFor="role">
            Role
          </label>
          <select id="role" name="role" className="field" defaultValue={role ?? ''}>
            <option value="">All</option>
            <option value="user">Customer</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="field" defaultValue={status ?? ''}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Filter
        </button>
        <Link href="/admin/users" className="btn btn-ghost">
          Reset
        </Link>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Bookings</th>
              <th>Total spent</th>
              <th>Registered</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-ink-muted">
                  No account matches these filters.
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
                      {user.role === 'admin' ? 'Administrator' : 'Customer'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {user.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="tabular-nums">{user.bookings}</td>
                  <td className="tabular-nums">{formatPrice(user.spent)}</td>
                  <td className="text-xs">{formatDate(user.created_at)}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/users/${user.id}`} className="btn btn-ghost px-2 py-1 text-xs">
                        Edit
                      </Link>
                      <ActionButton
                        action={toggleUserStatus}
                        fields={{ id: user.id }}
                        label={user.status === 'active' ? 'Suspend' : 'Reactivate'}
                        variant="ghost"
                      />
                      <ActionButton
                        action={removeUser}
                        fields={{ id: user.id }}
                        label="Delete"
                        variant="danger"
                        confirmText={`Delete the account ${user.email} and all of its bookings?`}
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
