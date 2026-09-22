import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/ui';
import { removeAirport } from '@/actions/admin';
import { listAirports } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Aéroports' };

export default async function AdminAirportsPage() {
  const airports = await listAirports();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aéroports"
        subtitle={`${airports.length} aéroports desservis`}
        action={
          <Link href="/admin/aeroports/nouveau" className="btn btn-primary">
            Ajouter un aéroport
          </Link>
        }
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>IATA</th>
              <th>OACI</th>
              <th>Nom</th>
              <th>Ville</th>
              <th>Pays</th>
              <th>Fuseau horaire</th>
              <th>Coordonnées</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {airports.map((airport) => (
              <tr key={airport.id}>
                <td className="font-mono font-semibold">{airport.iata}</td>
                <td className="font-mono text-xs text-ink-muted">{airport.icao ?? '—'}</td>
                <td className="font-medium">{airport.name}</td>
                <td>{airport.city}</td>
                <td>{airport.country_name}</td>
                <td className="text-xs text-ink-muted">{airport.timezone}</td>
                <td className="text-xs tabular-nums text-ink-muted">
                  {airport.latitude.toFixed(2)}, {airport.longitude.toFixed(2)}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/aeroports/${airport.id}`} className="btn btn-ghost px-2 py-1 text-xs">
                      Modifier
                    </Link>
                    <ActionButton
                      action={removeAirport}
                      fields={{ id: airport.id }}
                      label="Supprimer"
                      variant="danger"
                      confirmText={`Supprimer l'aéroport ${airport.iata} ?`}
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
