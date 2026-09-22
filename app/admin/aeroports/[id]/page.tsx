import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { airportFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveAirport } from '@/actions/admin';
import { getAirport, listCountries } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Modifier un aéroport' };

export default async function EditAirportPage(props: PageProps<'/admin/aeroports/[id]'>) {
  const { id } = await props.params;
  const [airport, countries] = await Promise.all([getAirport(Number(id)), listCountries()]);
  if (!airport) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={airport.name} subtitle={`${airport.iata} · ${airport.city} · ${airport.country_name}`} />
      <div className="card p-6">
        <EntityForm
          action={saveAirport}
          id={airport.id}
          fields={airportFields(countries)}
          defaults={{
            iata: airport.iata,
            icao: airport.icao,
            name: airport.name,
            city: airport.city,
            country_id: airport.country_id,
            timezone: airport.timezone,
            latitude: airport.latitude,
            longitude: airport.longitude,
          }}
          submitLabel="Enregistrer"
          cancelHref="/admin/aeroports"
        />
      </div>
    </div>
  );
}
