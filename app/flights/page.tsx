import Link from 'next/link';
import type { Metadata } from 'next';
import { SearchForm } from '@/components/search-form';
import { FlightCard } from '@/components/flight-card';
import { Alert, EmptyState } from '@/components/ui';
import { priceCalendar, searchFlights } from '@/lib/queries/flights';
import { getAirportByIata, listActiveAirlines } from '@/lib/queries/reference';
import { computeQuote } from '@/lib/pricing';
import { CABIN_LABELS, type CabinClass } from '@/lib/types';
import { formatLongDate, formatPrice, today } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Flight search',
  description: 'Compare the available flights and pick your itinerary.',
};

function readCabin(value: string | undefined): CabinClass {
  return value === 'business' || value === 'first' ? value : 'economy';
}

function clamp(value: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export default async function FlightSearchPage(props: PageProps<'/flights'>) {
  const params = await props.searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const fromIata = read('from')?.toUpperCase();
  const toIata = read('to')?.toUpperCase();
  const date = read('date') ?? today();
  const back = read('return');
  const cabin = readCabin(read('cabin'));
  const adults = clamp(read('adults'), 1, 9, 1);
  const children = clamp(read('children'), 0, 8, 0);
  const infants = clamp(read('infants'), 0, 4, 0);
  const sort = (read('sort') ?? 'price') as 'price' | 'duration' | 'departure';
  const airlineId = Number(read('airline')) || undefined;
  const maxPrice = Number(read('maxPrice')) || undefined;

  const [origin, destination] = await Promise.all([
    fromIata ? getAirportByIata(fromIata) : undefined,
    toIata ? getAirportByIata(toIata) : undefined,
  ]);

  const asOption = (airport: typeof origin) =>
    airport
      ? {
          id: airport.id,
          iata: airport.iata,
          city: airport.city,
          name: airport.name,
          country_name: airport.country_name,
        }
      : null;

  const defaults = {
    from: asOption(origin),
    to: asOption(destination),
    date,
    back,
    cabin,
    adults,
    children,
    infants,
  };

  if (!origin || !destination) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Search flights</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Enter a departure airport and a destination to see the available flights.
        </p>
        <div className="mt-6">
          <SearchForm defaults={defaults} />
        </div>
        {fromIata || toIata ? (
          <div className="mt-6">
            <Alert tone="error">
              Unknown airport. Pick one of the suggestions from the drop-down list.
            </Alert>
          </div>
        ) : null}
      </div>
    );
  }

  const seats = adults + children;
  const roundTrip = Boolean(back);
  const selectedOutbound = Number(read('outbound')) || null;
  const selectedReturn = Number(read('returnFlight')) || null;

  const [outboundFlights, returnFlights, calendar, airlines] = await Promise.all([
    searchFlights({
      originId: origin.id,
      destinationId: destination.id,
      date,
      cabin,
      seats,
      airlineId,
      maxPrice,
      sort,
    }),
    roundTrip
      ? searchFlights({
          originId: destination.id,
          destinationId: origin.id,
          date: back!,
          cabin,
          seats,
          airlineId,
          maxPrice,
          sort,
        })
      : [],
    priceCalendar(origin.id, destination.id, date, cabin),
    listActiveAirlines(),
  ]);

  const baseQuery = new URLSearchParams({
    from: origin.iata,
    to: destination.iata,
    date,
    cabin,
    adults: String(adults),
    children: String(children),
    infants: String(infants),
  });
  if (roundTrip) baseQuery.set('return', back!);
  if (airlineId) baseQuery.set('airline', String(airlineId));
  if (maxPrice) baseQuery.set('maxPrice', String(maxPrice));
  if (sort !== 'price') baseQuery.set('sort', sort);

  const withParam = (key: string, value: string | number) => {
    const query = new URLSearchParams(baseQuery);
    query.set(key, String(value));
    return `/flights?${query.toString()}`;
  };

  const bookingHref = (outboundId: number, returnId?: number | null) => {
    const query = new URLSearchParams({
      outbound: String(outboundId),
      cabin,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
    });
    if (returnId) query.set('return', String(returnId));
    return `/book?${query.toString()}`;
  };

  const chosenOutbound = outboundFlights.find((flight) => flight.id === selectedOutbound) ?? null;
  const chosenReturn = returnFlights.find((flight) => flight.id === selectedReturn) ?? null;

  const quote =
    chosenOutbound && (!roundTrip || chosenReturn)
      ? computeQuote(chosenOutbound, chosenReturn, cabin, {
          adult: adults,
          child: children,
          infant: infants,
        })
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-600">
          Home
        </Link>{' '}
        / Flights
      </nav>

      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        {origin.city} ({origin.iata}) → {destination.city} ({destination.iata})
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        {formatLongDate(date)}
        {roundTrip ? ` · returning ${formatLongDate(back!)}` : ''} · {CABIN_LABELS[cabin]} ·{' '}
        {adults + children + infants} passenger{adults + children + infants > 1 ? 's' : ''}
      </p>

      <details className="card mt-4 p-4">
        <summary className="cursor-pointer text-sm font-semibold">Change search</summary>
        <div className="mt-4">
          <SearchForm defaults={defaults} compact />
        </div>
      </details>

      {calendar.length > 1 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold">Cheapest dates</h2>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {calendar.map((entry) => (
              <Link
                key={entry.date}
                href={withParam('date', entry.date)}
                className={`card min-w-28 px-3 py-2 text-center transition-colors hover:border-brand-400 ${
                  entry.date === date ? 'border-brand-500 bg-brand-50 dark:bg-brand-950' : ''
                }`}
              >
                <p className="text-xs text-ink-muted">
                  {new Date(`${entry.date}T12:00:00Z`).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    timeZone: 'UTC',
                  })}
                </p>
                <p className="text-sm font-semibold">{formatPrice(entry.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <form method="get" action="/flights" className="card mt-6 flex flex-wrap items-end gap-3 p-4">
        <input type="hidden" name="from" value={origin.iata} />
        <input type="hidden" name="to" value={destination.iata} />
        <input type="hidden" name="date" value={date} />
        {roundTrip ? <input type="hidden" name="return" value={back!} /> : null}
        <input type="hidden" name="cabin" value={cabin} />
        <input type="hidden" name="adults" value={adults} />
        <input type="hidden" name="children" value={children} />
        <input type="hidden" name="infants" value={infants} />

        <div className="w-full sm:w-52">
          <label className="label" htmlFor="filter-airline">
            Airline
          </label>
          <select id="filter-airline" name="airline" className="field" defaultValue={airlineId ?? ''}>
            <option value="">All</option>
            {airlines.map((airline) => (
              <option key={airline.id} value={airline.id}>
                {airline.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-40">
          <label className="label" htmlFor="filter-price">
            Maximum price (€)
          </label>
          <input
            id="filter-price"
            name="maxPrice"
            type="number"
            min={0}
            step={10}
            className="field"
            defaultValue={maxPrice ?? ''}
            placeholder="No limit"
          />
        </div>

        <div className="w-full sm:w-48">
          <label className="label" htmlFor="filter-sort">
            Sort by
          </label>
          <select id="filter-sort" name="sort" className="field" defaultValue={sort}>
            <option value="price">Lowest price</option>
            <option value="duration">Shortest duration</option>
            <option value="departure">Departure time</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary">
          Apply
        </button>
        {airlineId || maxPrice || sort !== 'price' ? (
          <Link
            href={`/flights?from=${origin.iata}&to=${destination.iata}&date=${date}${roundTrip ? `&return=${back}` : ''}&cabin=${cabin}&adults=${adults}&children=${children}&infants=${infants}`}
            className="btn btn-ghost"
          >
            Reset
          </Link>
        ) : null}
      </form>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">
          Outbound — {formatLongDate(date)}{' '}
          <span className="text-sm font-normal text-ink-muted">
            ({outboundFlights.length} flight{outboundFlights.length > 1 ? 's' : ''})
          </span>
        </h2>

        <div className="mt-4 space-y-4">
          {outboundFlights.length === 0 ? (
            <EmptyState
              title="No flight matches this search"
              description="Try another date, another cabin, or widen the filters."
            />
          ) : (
            outboundFlights.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                cabin={cabin}
                passengers={seats}
                selected={flight.id === selectedOutbound}
                href={roundTrip ? withParam('outbound', flight.id) : bookingHref(flight.id)}
                actionLabel={
                  roundTrip
                    ? flight.id === selectedOutbound
                      ? 'Selected'
                      : 'Choose this outbound'
                    : 'Book'
                }
              />
            ))
          )}
        </div>
      </section>

      {roundTrip ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">
            Return — {formatLongDate(back!)}{' '}
            <span className="text-sm font-normal text-ink-muted">
              ({returnFlights.length} flight{returnFlights.length > 1 ? 's' : ''})
            </span>
          </h2>

          <div className="mt-4 space-y-4">
            {returnFlights.length === 0 ? (
              <EmptyState
                title="No return flight available on this date"
                description="Choose another return date."
              />
            ) : (
              returnFlights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  cabin={cabin}
                  passengers={seats}
                  selected={flight.id === selectedReturn}
                  href={withParam('returnFlight', flight.id)}
                  actionLabel={flight.id === selectedReturn ? 'Selected' : 'Choose this return'}
                />
              ))
            )}
          </div>
        </section>
      ) : null}

      {roundTrip && quote && chosenOutbound && chosenReturn ? (
        <div className="sticky bottom-4 mt-8">
          <div className="card flex flex-wrap items-center justify-between gap-4 border-brand-500 p-4 shadow-xl">
            <div className="text-sm">
              <p className="font-semibold">
                {chosenOutbound.flight_number} · {chosenReturn.flight_number}
              </p>
              <p className="text-ink-muted">
                Round trip {origin.iata} ⇄ {destination.iata} — {CABIN_LABELS[cabin]}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-ink-muted">Total including taxes</p>
                <p className="text-xl font-bold">{formatPrice(quote.total)}</p>
              </div>
              <Link href={bookingHref(chosenOutbound.id, chosenReturn.id)} className="btn btn-primary">
                Continue
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
