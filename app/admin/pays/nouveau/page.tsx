import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { countryFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveCountry } from '@/actions/admin';

export const metadata: Metadata = { title: 'Ajouter un pays' };

export default function NewCountryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Ajouter un pays" subtitle="Les pays servent aux aéroports, aux compagnies et aux nationalités des passagers." />
      <div className="card p-6">
        <EntityForm
          action={saveCountry}
          fields={countryFields}
          submitLabel="Créer le pays"
          cancelHref="/admin/pays"
        />
      </div>
    </div>
  );
}
