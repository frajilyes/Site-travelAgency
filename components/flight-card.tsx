import Link from 'next/link';
import type { CabinClass, FlightDetail } from '@/lib/types';
import { CABIN_LABELS } from '@/lib/types';
import { formatDuration, formatPrice, formatTime, priceForClass, seatsForClass } from '@/lib/format';
import { FlightBadge } from './ui';

/** The visual timeline shared by the search results and the flight detail page. */
export function FlightTimeline({ flight }: { flight: FlightDetail }) {
  const dayShift =
    flight.arrival_time.slice(0, 10) !== flight.departure_time.slice(0, 10)
      ? Math.round(
          (Date.parse(`${flight.arrival_time.slice(0, 10)}T00:00:00Z`) -
            Date.parse(`${flight.departure_time.slice(0, 10)}T00:00:00Z`)) /
            86_400_000,
        )
      : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="text-center">
        <p className="text-xl font-bold tabular-nums">{formatTime(flight.departure_time)}</p>
        <p className="font-mono text-xs text-ink-muted">{flight.origin_iata}</p>
      </div>

      <div className="flex-1">
        <p className="text-center text-xs text-ink-muted">{formatDuration(flight.duration_minutes)}</p>
        <div className="relative my-1 h-px bg-line">
          <span className="absolute -top-1 right-0 text-[10px] leading-none text-brand-500" aria-hidden="true">
            ▶
          </span>
        </div>
        <p className="text-center text-xs text-ink-muted">Direct · {flight.distance_km} km</p>
      </div>

      <div className="text-center">
        <p className="text-xl font-bold tabular-nums">
          {formatTime(flight.arrival_time)}
          {dayShift > 0 ? <sup className="ml-0.5 text-xs text-brand-500">+{dayShift}</sup> : null}
        </p>
        <p className="font-mono text-xs text-ink-muted">{flight.destination_iata}</p>
      </div>
    </div>
  );
}

export function FlightCard({
  flight,
  cabin,
  passengers,
  href,
  selected = false,
  actionLabel = 'Sélectionner',
}: {
  flight: FlightDetail;
  cabin: CabinClass;
  passengers: number;
  href: string;
  selected?: boolean;
  actionLabel?: string;
}) {
  const unitPrice = priceForClass(flight, cabin);
  const seatsLeft = seatsForClass(flight, cabin);

  return (
    <article
      className={`card p-4 transition-colors sm:p-5 ${
        selected ? 'border-brand-500 ring-2 ring-brand-200 dark:ring-brand-800' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge badge-info font-mono">{flight.flight_number}</span>
        <span className="text-sm font-medium">{flight.airline_name}</span>
        <span className="text-xs text-ink-muted">
          {flight.aircraft_manufacturer} {flight.aircraft_model}
        </span>
        <FlightBadge status={flight.status} />
        {selected ? <span className="badge badge-success">Sélectionné</span> : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <FlightTimeline flight={flight} />
          <p className="mt-3 text-xs text-ink-muted">
            {flight.origin_city} · {flight.origin_name} → {flight.destination_city} ·{' '}
            {flight.destination_name}
          </p>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-line pt-4 lg:min-w-52 lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="text-right">
            <p className="text-xs text-ink-muted">{CABIN_LABELS[cabin]}</p>
            <p className="text-2xl font-bold">{formatPrice(unitPrice)}</p>
            <p className="text-xs text-ink-muted">
              par adulte · {seatsLeft} place{seatsLeft > 1 ? 's' : ''} restante
              {seatsLeft > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-ink-muted">Bagage en soute {flight.baggage_kg} kg</p>
          </div>

          {seatsLeft >= passengers ? (
            <Link href={href} className="btn btn-primary whitespace-nowrap">
              {actionLabel}
            </Link>
          ) : (
            <span className="badge badge-danger">Complet pour {passengers} passagers</span>
          )}
        </div>
      </div>
    </article>
  );
}
