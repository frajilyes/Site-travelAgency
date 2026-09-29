import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { countryFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveCountry } from '@/actions/admin';

export const metadata: Metadata = { title: 'Add a country' };

export default function NewCountryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Add a country" subtitle="Countries are used by airports, airlines and passenger nationalities." />
      <div className="card p-6">
        <EntityForm
          action={saveCountry}
          fields={countryFields}
          submitLabel="Create country"
          cancelHref="/admin/countries"
        />
      </div>
    </div>
  );
}
