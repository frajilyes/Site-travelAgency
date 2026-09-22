import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { aircraftFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveAircraft } from '@/actions/admin';

export const metadata: Metadata = { title: 'Ajouter un appareil' };

export default function NewAircraftPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajouter un appareil"
        subtitle="La capacité limite le nombre de places vendables et la vitesse sert au calcul des durées de vol."
      />
      <div className="card p-6">
        <EntityForm
          action={saveAircraft}
          fields={aircraftFields}
          submitLabel="Créer l’appareil"
          cancelHref="/admin/avions"
        />
      </div>
    </div>
  );
}
