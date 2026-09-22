import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { countryFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveCountry } from '@/actions/admin';
import { getCountry } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Modifier un pays' };

export default async function EditCountryPage(props: PageProps<'/admin/pays/[id]'>) {
  const { id } = await props.params;
  const country = await getCountry(Number(id));
  if (!country) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={country.name} subtitle={`Code ${country.code} · ${country.continent}`} />
      <div className="card p-6">
        <EntityForm
          action={saveCountry}
          id={country.id}
          fields={countryFields}
          defaults={{ ...country }}
          submitLabel="Enregistrer"
          cancelHref="/admin/pays"
        />
      </div>
    </div>
  );
}
