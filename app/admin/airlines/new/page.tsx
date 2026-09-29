import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { airlineFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveAirline } from '@/actions/admin';
import { listCountries } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Add an airline' };

export default async function NewAirlinePage() {
  const countries = await listCountries();

  return (
    <div className="space-y-6">
      <PageHeader title="Add an airline" />
      <div className="card p-6">
        <EntityForm
          action={saveAirline}
          fields={airlineFields(countries)}
          defaults={{ active: true }}
          submitLabel="Create airline"
          cancelHref="/admin/airlines"
        />
      </div>
    </div>
  );
}
