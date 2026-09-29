import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton, StatusSelect } from '@/components/action-button';
import { PageHeader, Pagination } from '@/components/ui';
import { changeFlightStatus, removeFlight } from '@/actions/admin';
import { listFlights } from '@/lib/queries/flights';
import { listActiveAirlines } from '@/lib/queries/reference';
import { FLIGHT_STATUS_LABELS, type FlightStatus } from '@/lib/types';
import { formatDateTime, formatDuration, formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Flight management',
};

const STATUS_OPTIONS = (Object.keys(FLIGHT_STATUS_LABELS) as FlightStatus[]).map((status) => ({
  value: status,
  label: FLIGHT_STATUS_LABELS[status],
}));

const PER_PAGE = 20;

export default async function AdminFlightsPage(props: PageProps<'/admin/flights'>) {
  const params = await props.searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const search = read('q');
  const status = read('status') as FlightStatus | undefined;
  const airlineId = Number(read('airline')) || undefined;
  const from = read('from');
  const to = read('to');
  const page = Math.max(1, Number(read('page')) || 1);

  const [{ rows, total }, airlines] = await Promise.all([
    listFlights({
      search,
      status: status && status in FLIGHT_STATUS_LABELS ? status : undefined,
      airlineId,
      from,
      to,
      page,
      perPage: PER_PAGE,
    }),
    listActiveAirlines(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flights"
        subtitle={`${total.toLocaleString('en-GB')} flight${total > 1 ? 's' : ''} scheduled`}
        action={
          <Link href="/admin/flights/new" className="btn btn-primary">
            New flight
          </Link>
        }
      />

      <form method="get" action="/admin/flights" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="w-full sm:w-56">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            className="field"
            defaultValue={search ?? ''}
            placeholder="AF1234, CDG, Paris…"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="label" htmlFor="airline">
            Airline
          </label>
          <select id="airline" name="airline" className="field" defaultValue={airlineId ?? ''}>
            <option value="">All</option>
            {airlines.map((airline) => (
              <option key={airline.id} value={airline.id}>
                {airline.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="field" defaultValue={status ?? ''}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label className="label" htmlFor="from">
            From
          </label>
          <input id="from" name="from" type="date" className="field" defaultValue={from ?? ''} />
        </div>
        <div className="w-full sm:w-40">
          <label className="label" htmlFor="to">
            To
          </label>
          <input id="to" name="to" type="date" className="field" defaultValue={to ?? ''} />
        </div>
        <button type="submit" className="btn btn-primary">
          Filter
        </button>
        <Link href="/admin/flights" className="btn btn-ghost">
          Reset
        </Link>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Route</th>
              <th>Departure</th>
              <th>Duration</th>
              <th>Aircraft</th>
              <th>Seats left</th>
              <th>Fares</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-ink-muted">
                  No flight matches these filters.
                </td>
              </tr>
            ) : (
              rows.map((flight) => (
                <tr key={flight.id}>
                  <td>
                    <p className="font-mono font-semibold">{flight.flight_number}</p>
                    <p className="text-xs text-ink-muted">{flight.airline_name}</p>
                  </td>
                  <td>
                    <p className="font-mono text-xs font-semibold">
                      {flight.origin_iata} → {flight.destination_iata}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {flight.origin_city} → {flight.destination_city}
                    </p>
                  </td>
                  <td className="text-xs">
                    <p>{formatDateTime(flight.departure_time)}</p>
                    <p className="text-ink-muted">arrives {formatDateTime(flight.arrival_time)}</p>
                  </td>
                  <td className="text-xs">{formatDuration(flight.duration_minutes)}</td>
                  <td className="text-xs">
                    <p>{flight.aircraft_model}</p>
                    <p className="text-ink-muted">{flight.distance_km} km</p>
                  </td>
                  <td className="text-xs tabular-nums">
                    <p>{flight.seats_economy} eco</p>
                    <p className="text-ink-muted">
                      {flight.seats_business} bus. · {flight.seats_first} first
                    </p>
                  </td>
                  <td className="text-xs tabular-nums">
                    <p>{formatPrice(flight.price_economy)}</p>
                    <p className="text-ink-muted">{formatPrice(flight.price_business)}</p>
                  </td>
                  <td>
                    <StatusSelect
                      action={changeFlightStatus}
                      fields={{ id: flight.id }}
                      name="status"
                      value={flight.status}
                      options={STATUS_OPTIONS}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/flights/${flight.id}`} className="btn btn-ghost px-2 py-1 text-xs">
                        Edit
                      </Link>
                      <ActionButton
                        action={removeFlight}
                        fields={{ id: flight.id }}
                        label="Delete"
                        variant="danger"
                        confirmText={`Permanently delete flight ${flight.flight_number} on ${formatDateTime(flight.departure_time)}?`}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        perPage={PER_PAGE}
        total={total}
        basePath="/admin/flights"
        params={{
          q: search,
          status,
          airline: airlineId ? String(airlineId) : undefined,
          from,
          to,
        }}
      />
    </div>
  );
}
