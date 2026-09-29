import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { aircraftFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveAircraft } from '@/actions/admin';

export const metadata: Metadata = { title: 'Add an aircraft' };

export default function NewAircraftPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add an aircraft"
        subtitle="Capacity caps how many seats can be sold, and cruise speed is used to work out flight times."
      />
      <div className="card p-6">
        <EntityForm
          action={saveAircraft}
          fields={aircraftFields}
          submitLabel="Create aircraft"
          cancelHref="/admin/aircraft"
        />
      </div>
    </div>
  );
}
