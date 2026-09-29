import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { airportFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveAirport } from '@/actions/admin';
import { listCountries } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Add an airport' };

export default async function NewAirportPage() {
  const countries = await listCountries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add an airport"
        subtitle="The coordinates are used to work out distances, the timezone to work out local times."
      />
      <div className="card p-6">
        <EntityForm
          action={saveAirport}
          fields={airportFields(countries)}
          submitLabel="Create airport"
          cancelHref="/admin/airports"
        />
      </div>
    </div>
  );
}
