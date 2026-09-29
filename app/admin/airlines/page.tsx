import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/ui';
import { removeAirline } from '@/actions/admin';
import { listAirlines } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Airlines' };

export default async function AdminAirlinesPage() {
  const airlines = await listAirlines();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Airlines"
        subtitle={`${airlines.length} partner airlines`}
        action={
          <Link href="/admin/airlines/new" className="btn btn-primary">
            Add an airline
          </Link>
        }
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>IATA</th>
              <th>Name</th>
              <th>Country</th>
              <th>Alliance</th>
              <th>Flights</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {airlines.map((airline) => (
              <tr key={airline.id}>
                <td className="font-mono font-semibold">{airline.iata}</td>
                <td className="font-medium">{airline.name}</td>
                <td>{airline.country_name}</td>
                <td>{airline.alliance ?? '—'}</td>
                <td className="tabular-nums">{airline.flights.toLocaleString('en-GB')}</td>
                <td>
                  <span className={`badge ${airline.active ? 'badge-success' : 'badge-danger'}`}>
                    {airline.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/airlines/${airline.id}`} className="btn btn-ghost px-2 py-1 text-xs">
                      Edit
                    </Link>
                    <ActionButton
                      action={removeAirline}
                      fields={{ id: airline.id }}
                      label="Delete"
                      variant="danger"
                      confirmText={`Delete ${airline.name}?`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
