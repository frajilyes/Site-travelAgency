import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { airlineFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveAirline } from '@/actions/admin';
import { listCountries } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Ajouter une compagnie' };

export default async function NewAirlinePage() {
  const countries = await listCountries();

  return (
    <div className="space-y-6">
      <PageHeader title="Ajouter une compagnie" />
      <div className="card p-6">
        <EntityForm
          action={saveAirline}
          fields={airlineFields(countries)}
          defaults={{ active: true }}
          submitLabel="Créer la compagnie"
          cancelHref="/admin/compagnies"
        />
      </div>
    </div>
  );
}
