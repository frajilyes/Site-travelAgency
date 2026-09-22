import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/ui';
import { removeAircraft } from '@/actions/admin';
import { listAircraft } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Flotte' };

export default async function AdminAircraftPage() {
  const fleet = await listAircraft();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flotte"
        subtitle={`${fleet.length} types d’appareils`}
        action={
          <Link href="/admin/avions/nouveau" className="btn btn-primary">
            Ajouter un appareil
          </Link>
        }
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Constructeur</th>
              <th>Modèle</th>
              <th>Éco</th>
              <th>Affaires</th>
              <th>Première</th>
              <th>Total</th>
              <th>Rayon</th>
              <th>Vitesse</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {fleet.map((plane) => (
              <tr key={plane.id}>
                <td className="font-mono font-semibold">{plane.code}</td>
                <td>{plane.manufacturer}</td>
                <td className="font-medium">{plane.model}</td>
                <td className="tabular-nums">{plane.capacity_economy}</td>
                <td className="tabular-nums">{plane.capacity_business}</td>
                <td className="tabular-nums">{plane.capacity_first}</td>
                <td className="tabular-nums font-semibold">
                  {plane.capacity_economy + plane.capacity_business + plane.capacity_first}
                </td>
                <td className="tabular-nums">{plane.range_km.toLocaleString('fr-FR')} km</td>
                <td className="tabular-nums">{plane.cruise_speed_kmh} km/h</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/avions/${plane.id}`} className="btn btn-ghost px-2 py-1 text-xs">
                      Modifier
                    </Link>
                    <ActionButton
                      action={removeAircraft}
                      fields={{ id: plane.id }}
                      label="Supprimer"
                      variant="danger"
                      confirmText={`Supprimer ${plane.manufacturer} ${plane.model} ?`}
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
