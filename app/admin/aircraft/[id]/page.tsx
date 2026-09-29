import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { aircraftFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveAircraft } from '@/actions/admin';
import { getAircraft } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Edit aircraft' };

export default async function EditAircraftPage(props: PageProps<'/admin/aircraft/[id]'>) {
  const { id } = await props.params;
  const plane = await getAircraft(Number(id));
  if (!plane) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`${plane.manufacturer} ${plane.model}`} subtitle={`Code ${plane.code}`} />
      <div className="card p-6">
        <EntityForm
          action={saveAircraft}
          id={plane.id}
          fields={aircraftFields}
          defaults={{ ...plane }}
          submitLabel="Save"
          cancelHref="/admin/aircraft"
        />
      </div>
    </div>
  );
}
