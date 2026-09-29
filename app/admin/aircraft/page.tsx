import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/ui';
import { removeAircraft } from '@/actions/admin';
import { listAircraft } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Fleet' };

export default async function AdminAircraftPage() {
  const fleet = await listAircraft();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet"
        subtitle={`${fleet.length} aircraft types`}
        action={
          <Link href="/admin/aircraft/new" className="btn btn-primary">
            Add an aircraft
          </Link>
        }
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Manufacturer</th>
              <th>Model</th>
              <th>Economy</th>
              <th>Business</th>
              <th>First</th>
              <th>Total</th>
              <th>Range</th>
              <th>Speed</th>
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
                <td className="tabular-nums">{plane.range_km.toLocaleString('en-GB')} km</td>
                <td className="tabular-nums">{plane.cruise_speed_kmh} km/h</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/aircraft/${plane.id}`} className="btn btn-ghost px-2 py-1 text-xs">
                      Edit
                    </Link>
                    <ActionButton
                      action={removeAircraft}
                      fields={{ id: plane.id }}
                      label="Delete"
                      variant="danger"
                      confirmText={`Delete ${plane.manufacturer} ${plane.model}?`}
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
