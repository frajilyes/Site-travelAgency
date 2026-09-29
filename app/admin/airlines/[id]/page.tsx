import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { airlineFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveAirline } from '@/actions/admin';
import { getAirline, listCountries } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Edit airline' };

export default async function EditAirlinePage(props: PageProps<'/admin/airlines/[id]'>) {
  const { id } = await props.params;
  const [airline, countries] = await Promise.all([getAirline(Number(id)), listCountries()]);
  if (!airline) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={airline.name} subtitle={`IATA code ${airline.iata}`} />
      <div className="card p-6">
        <EntityForm
          action={saveAirline}
          id={airline.id}
          fields={airlineFields(countries)}
          defaults={{
            iata: airline.iata,
            name: airline.name,
            country_id: airline.country_id,
            alliance: airline.alliance,
            active: airline.active === 1,
          }}
          submitLabel="Save"
          cancelHref="/admin/airlines"
        />
      </div>
    </div>
  );
}
