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
  title: 'Recherche de vols',
  description: 'Comparez les vols disponibles et choisissez votre itinéraire.',
};

function readCabin(value: string | undefined): CabinClass {
  return value === 'business' || value === 'first' ? value : 'economy';
}

function clamp(value: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export default async function FlightSearchPage(props: PageProps<'/vols'>) {
  const params = await props.searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const fromIata = read('from')?.toUpperCase();
  const toIata = read('to')?.toUpperCase();
  const date = read('date') ?? today();
  const back = read('retour');
  const cabin = readCabin(read('cabine'));
  const adults = clamp(read('adultes'), 1, 9, 1);
  const children = clamp(read('enfants'), 0, 8, 0);
  const infants = clamp(read('bebes'), 0, 4, 0);
  const sort = (read('tri') ?? 'price') as 'price' | 'duration' | 'departure';
  const airlineId = Number(read('compagnie')) || undefined;
  const maxPrice = Number(read('prixMax')) || undefined;

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
        <h1 className="text-2xl font-bold tracking-tight">Rechercher un vol</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Indiquez un aéroport de départ et une destination pour voir les vols disponibles.
        </p>
        <div className="mt-6">
          <SearchForm defaults={defaults} />
        </div>
        {fromIata || toIata ? (
          <div className="mt-6">
            <Alert tone="error">
              Aéroport inconnu. Choisissez une proposition dans la liste déroulante.
            </Alert>
          </div>
        ) : null}
      </div>
    );
  }

  const seats = adults + children;
  const roundTrip = Boolean(back);
  const selectedOutbound = Number(read('aller')) || null;
  const selectedReturn = Number(read('retourVol')) || null;

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
    cabine: cabin,
    adultes: String(adults),
    enfants: String(children),
    bebes: String(infants),
  });
  if (roundTrip) baseQuery.set('retour', back!);
  if (airlineId) baseQuery.set('compagnie', String(airlineId));
  if (maxPrice) baseQuery.set('prixMax', String(maxPrice));
  if (sort !== 'price') baseQuery.set('tri', sort);

  const withParam = (key: string, value: string | number) => {
    const query = new URLSearchParams(baseQuery);
    query.set(key, String(value));
    return `/vols?${query.toString()}`;
  };

  const bookingHref = (outboundId: number, returnId?: number | null) => {
    const query = new URLSearchParams({
      aller: String(outboundId),
      cabine: cabin,
      adultes: String(adults),
      enfants: String(children),
      bebes: String(infants),
    });
    if (returnId) query.set('retour', String(returnId));
    return `/reserver?${query.toString()}`;
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
          Accueil
        </Link>{' '}
        / Vols
      </nav>

      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        {origin.city} ({origin.iata}) → {destination.city} ({destination.iata})
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        {formatLongDate(date)}
        {roundTrip ? ` · retour le ${formatLongDate(back!)}` : ''} · {CABIN_LABELS[cabin]} ·{' '}
        {adults + children + infants} passager{adults + children + infants > 1 ? 's' : ''}
      </p>

      <details className="card mt-4 p-4">
        <summary className="cursor-pointer text-sm font-semibold">Modifier la recherche</summary>
        <div className="mt-4">
          <SearchForm defaults={defaults} compact />
        </div>
      </details>

      {calendar.length > 1 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold">Dates les plus économiques</h2>
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
                  {new Date(`${entry.date}T12:00:00Z`).toLocaleDateString('fr-FR', {
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

      <form method="get" action="/vols" className="card mt-6 flex flex-wrap items-end gap-3 p-4">
        <input type="hidden" name="from" value={origin.iata} />
        <input type="hidden" name="to" value={destination.iata} />
        <input type="hidden" name="date" value={date} />
        {roundTrip ? <input type="hidden" name="retour" value={back!} /> : null}
        <input type="hidden" name="cabine" value={cabin} />
        <input type="hidden" name="adultes" value={adults} />
        <input type="hidden" name="enfants" value={children} />
        <input type="hidden" name="bebes" value={infants} />

        <div className="w-full sm:w-52">
          <label className="label" htmlFor="filter-airline">
            Compagnie
          </label>
          <select id="filter-airline" name="compagnie" className="field" defaultValue={airlineId ?? ''}>
            <option value="">Toutes</option>
            {airlines.map((airline) => (
              <option key={airline.id} value={airline.id}>
                {airline.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-40">
          <label className="label" htmlFor="filter-price">
            Prix maximum (€)
          </label>
          <input
            id="filter-price"
            name="prixMax"
            type="number"
            min={0}
            step={10}
            className="field"
            defaultValue={maxPrice ?? ''}
            placeholder="Sans limite"
          />
        </div>

        <div className="w-full sm:w-48">
          <label className="label" htmlFor="filter-sort">
            Trier par
          </label>
          <select id="filter-sort" name="tri" className="field" defaultValue={sort}>
            <option value="price">Prix croissant</option>
            <option value="duration">Durée la plus courte</option>
            <option value="departure">Heure de départ</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary">
          Appliquer
        </button>
        {airlineId || maxPrice || sort !== 'price' ? (
          <Link
            href={`/vols?from=${origin.iata}&to=${destination.iata}&date=${date}${roundTrip ? `&retour=${back}` : ''}&cabine=${cabin}&adultes=${adults}&enfants=${children}&bebes=${infants}`}
            className="btn btn-ghost"
          >
            Réinitialiser
          </Link>
        ) : null}
      </form>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">
          Aller — {formatLongDate(date)}{' '}
          <span className="text-sm font-normal text-ink-muted">
            ({outboundFlights.length} vol{outboundFlights.length > 1 ? 's' : ''})
          </span>
        </h2>

        <div className="mt-4 space-y-4">
          {outboundFlights.length === 0 ? (
            <EmptyState
              title="Aucun vol ne correspond à cette recherche"
              description="Essayez une autre date, une autre classe, ou élargissez les filtres."
            />
          ) : (
            outboundFlights.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                cabin={cabin}
                passengers={seats}
                selected={flight.id === selectedOutbound}
                href={roundTrip ? withParam('aller', flight.id) : bookingHref(flight.id)}
                actionLabel={
                  roundTrip
                    ? flight.id === selectedOutbound
                      ? 'Sélectionné'
                      : 'Choisir cet aller'
                    : 'Réserver'
                }
              />
            ))
          )}
        </div>
      </section>

      {roundTrip ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">
            Retour — {formatLongDate(back!)}{' '}
            <span className="text-sm font-normal text-ink-muted">
              ({returnFlights.length} vol{returnFlights.length > 1 ? 's' : ''})
            </span>
          </h2>

          <div className="mt-4 space-y-4">
            {returnFlights.length === 0 ? (
              <EmptyState
                title="Aucun vol retour disponible à cette date"
                description="Choisissez une autre date de retour."
              />
            ) : (
              returnFlights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  cabin={cabin}
                  passengers={seats}
                  selected={flight.id === selectedReturn}
                  href={withParam('retourVol', flight.id)}
                  actionLabel={flight.id === selectedReturn ? 'Sélectionné' : 'Choisir ce retour'}
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
                Aller-retour {origin.iata} ⇄ {destination.iata} — {CABIN_LABELS[cabin]}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-ink-muted">Total taxes comprises</p>
                <p className="text-xl font-bold">{formatPrice(quote.total)}</p>
              </div>
              <Link href={bookingHref(chosenOutbound.id, chosenReturn.id)} className="btn btn-primary">
                Continuer
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
