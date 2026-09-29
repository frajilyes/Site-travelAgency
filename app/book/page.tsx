import Link from 'next/link';
import type { Metadata } from 'next';
import { BookingForm } from '@/components/booking-form';
import { FlightTimeline } from '@/components/flight-card';
import { Alert } from '@/components/ui';
import { requireUser } from '@/lib/dal';
import { getFlight } from '@/lib/queries/flights';
import { listCountries } from '@/lib/queries/reference';
import { AIRPORT_FEE, TAX_RATE, computeQuote } from '@/lib/pricing';
import { CABIN_LABELS, type CabinClass, type FlightDetail } from '@/lib/types';
import { formatLongDate, formatPrice, priceForClass, seatsForClass } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Complete your booking',
};

function readCabin(value: string | undefined): CabinClass {
  return value === 'business' || value === 'first' ? value : 'economy';
}

function clamp(value: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function Leg({ flight, cabin, label }: { flight: FlightDetail; cabin: CabinClass; label: string }) {
  return (
    <div className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-sm font-medium">
        {flight.airline_name} · {flight.flight_number}
      </p>
      <p className="text-xs text-ink-muted">{formatLongDate(flight.departure_time)}</p>
      <div className="mt-3">
        <FlightTimeline flight={flight} />
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {flight.aircraft_manufacturer} {flight.aircraft_model} · baggage {flight.baggage_kg} kg ·{' '}
        {CABIN_LABELS[cabin]}
      </p>
    </div>
  );
}

export default async function BookingPage(props: PageProps<'/book'>) {
  const user = await requireUser('/book');
  const params = await props.searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const cabin = readCabin(read('cabin'));
  const adults = clamp(read('adults'), 1, 9, 1);
  const children = clamp(read('children'), 0, 8, 0);
  const infants = clamp(read('infants'), 0, 4, 0);

  const returnId = Number(read('return')) || null;
  const [outbound, returnFlight, countries] = await Promise.all([
    getFlight(Number(read('outbound'))),
    returnId ? getFlight(returnId).then((flight) => flight ?? null) : null,
    listCountries(),
  ]);

  if (!outbound || (returnId && !returnFlight)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Alert tone="error">This flight is no longer available. Please search again.</Alert>
        <Link href="/flights" className="btn btn-primary mt-4">
          Search flights
        </Link>
      </div>
    );
  }

  const seats = adults + children;
  const availability = Math.min(
    seatsForClass(outbound, cabin),
    returnFlight ? seatsForClass(returnFlight, cabin) : Number.POSITIVE_INFINITY,
  );

  if (availability < seats) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Alert tone="error">
          Only {availability} seat(s) left in {CABIN_LABELS[cabin].toLowerCase()} on this itinerary,
          for {seats} passenger(s) needing a seat.
        </Alert>
        <Link href="/flights" className="btn btn-primary mt-4">
          See other flights
        </Link>
      </div>
    );
  }

  const mix = { adult: adults, child: children, infant: infants };
  const quote = computeQuote(outbound, returnFlight, cabin, mix);
  const france = countries.find((country) => country.code === 'FR');

  const unit = priceForClass(outbound, cabin);
  const unitReturn = returnFlight ? priceForClass(returnFlight, cabin) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-sm text-ink-muted">
        <Link href="/flights" className="hover:text-brand-600">
          Flights
        </Link>{' '}
        / Booking
      </nav>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Complete your booking</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {adults} adult{adults > 1 ? 's' : ''}
        {children > 0 ? `, ${children} child${children > 1 ? 'ren' : ''}` : ''}
        {infants > 0 ? `, ${infants} infant${infants > 1 ? 's' : ''}` : ''} · {CABIN_LABELS[cabin]}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <BookingForm
          outboundFlightId={outbound.id}
          returnFlightId={returnFlight?.id ?? null}
          cabin={cabin}
          counts={{ adults, children, infants }}
          countries={countries}
          user={user}
          totalLabel={formatPrice(quote.total)}
          defaultNationalityId={france?.id}
        />

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-semibold">Your itinerary</h2>
            <Leg flight={outbound} cabin={cabin} label="Outbound" />
            {returnFlight ? <Leg flight={returnFlight} cabin={cabin} label="Return" /> : null}
          </section>

          <section className="card p-5">
            <h2 className="text-lg font-semibold">Price breakdown</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">
                  Outbound — {adults} adult{adults > 1 ? 's' : ''} × {formatPrice(unit)}
                </dt>
                <dd className="tabular-nums">{formatPrice(unit * adults)}</dd>
              </div>
              {children > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">
                    Outbound — {children} child{children > 1 ? 'ren' : ''} (−25%)
                  </dt>
                  <dd className="tabular-nums">{formatPrice(unit * 0.75 * children)}</dd>
                </div>
              ) : null}
              {infants > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">
                    Outbound — {infants} infant{infants > 1 ? 's' : ''} (10%)
                  </dt>
                  <dd className="tabular-nums">{formatPrice(unit * 0.1 * infants)}</dd>
                </div>
              ) : null}

              {returnFlight ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Return — {adults + children + infants} passenger(s)</dt>
                  <dd className="tabular-nums">
                    {formatPrice(unitReturn * (adults + children * 0.75 + infants * 0.1))}
                  </dd>
                </div>
              ) : null}

              <div className="flex justify-between gap-4 border-t border-line pt-2">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(quote.base)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">
                  Taxes ({Math.round(TAX_RATE * 100)}%) and airport charges ({formatPrice(AIRPORT_FEE)}{' '}
                  per passenger per flight)
                </dt>
                <dd className="tabular-nums">{formatPrice(quote.taxes)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(quote.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-muted">
              Full refund if you cancel more than 7 days before departure, 50% between 7 days and 24
              hours.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
