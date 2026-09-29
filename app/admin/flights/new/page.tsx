import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { flightFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveFlight } from '@/actions/admin';
import { listAircraft, listAirports, listActiveAirlines } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Schedule a flight' };

export default async function NewFlightPage() {
  const [airlines, aircraft, airports] = await Promise.all([
    listActiveAirlines(),
    listAircraft(),
    listAirports(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule a flight"
        subtitle="Distance, duration and arrival time are calculated from the airports and the aircraft."
      />
      <div className="card p-6">
        <EntityForm
          action={saveFlight}
          fields={flightFields(airlines, aircraft, airports)}
          defaults={{ status: 'scheduled', baggage_kg: 23 }}
          submitLabel="Create flight"
          cancelHref="/admin/flights"
        />
      </div>
    </div>
  );
}
