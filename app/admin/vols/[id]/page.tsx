import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { flightFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveFlight } from '@/actions/admin';
import { getFlight } from '@/lib/queries/flights';
import { listAircraft, listAirports, listActiveAirlines } from '@/lib/queries/reference';
import { formatDateTime, formatDuration } from '@/lib/format';

export const metadata: Metadata = { title: 'Modifier un vol' };

export default async function EditFlightPage(props: PageProps<'/admin/vols/[id]'>) {
  const { id } = await props.params;
  const [flight, airlines, aircraft, airports] = await Promise.all([
    getFlight(Number(id)),
    listActiveAirlines(),
    listAircraft(),
    listAirports(),
  ]);
  if (!flight) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Vol ${flight.flight_number}`}
        subtitle={`${flight.origin_city} → ${flight.destination_city} · ${flight.distance_km} km · ${formatDuration(flight.duration_minutes)} · arrivée ${formatDateTime(flight.arrival_time)}`}
      />
      <div className="card p-6">
        <EntityForm
          action={saveFlight}
          id={flight.id}
          fields={flightFields(airlines, aircraft, airports)}
          defaults={{
            flight_number: flight.flight_number,
            airline_id: flight.airline_id,
            aircraft_id: flight.aircraft_id,
            origin_id: flight.origin_id,
            destination_id: flight.destination_id,
            departure_time: flight.departure_time,
            price_economy: flight.price_economy,
            price_business: flight.price_business,
            price_first: flight.price_first,
            seats_economy: flight.seats_economy,
            seats_business: flight.seats_business,
            seats_first: flight.seats_first,
            baggage_kg: flight.baggage_kg,
            status: flight.status,
          }}
          submitLabel="Enregistrer les modifications"
          cancelHref="/admin/vols"
        />
      </div>
    </div>
  );
}
