import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/ui';
import { removeAirline } from '@/actions/admin';
import { listAirlines } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Compagnies' };

export default async function AdminAirlinesPage() {
  const airlines = await listAirlines();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compagnies aériennes"
        subtitle={`${airlines.length} compagnies partenaires`}
        action={
          <Link href="/admin/compagnies/nouveau" className="btn btn-primary">
            Ajouter une compagnie
          </Link>
        }
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>IATA</th>
              <th>Nom</th>
              <th>Pays</th>
              <th>Alliance</th>
              <th>Vols</th>
              <th>Statut</th>
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
                <td className="tabular-nums">{airline.flights.toLocaleString('fr-FR')}</td>
                <td>
                  <span className={`badge ${airline.active ? 'badge-success' : 'badge-danger'}`}>
                    {airline.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/compagnies/${airline.id}`} className="btn btn-ghost px-2 py-1 text-xs">
                      Modifier
                    </Link>
                    <ActionButton
                      action={removeAirline}
                      fields={{ id: airline.id }}
                      label="Supprimer"
                      variant="danger"
                      confirmText={`Supprimer ${airline.name} ?`}
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
