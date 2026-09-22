import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { airportFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveAirport } from '@/actions/admin';
import { listCountries } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Ajouter un aéroport' };

export default async function NewAirportPage() {
  const countries = await listCountries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajouter un aéroport"
        subtitle="Les coordonnées servent au calcul des distances, le fuseau horaire au calcul des heures locales."
      />
      <div className="card p-6">
        <EntityForm
          action={saveAirport}
          fields={airportFields(countries)}
          submitLabel="Créer l’aéroport"
          cancelHref="/admin/aeroports"
        />
      </div>
    </div>
  );
}
