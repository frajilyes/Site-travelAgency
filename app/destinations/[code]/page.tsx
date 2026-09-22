import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { airlinesServingCountry, cheapestToCountry } from '@/lib/queries/flights';
import { getCountryByCode, listAirports } from '@/lib/queries/reference';
import { formatPrice, today } from '@/lib/format';

export async function generateMetadata(
  props: PageProps<'/destinations/[code]'>,
): Promise<Metadata> {
  const { code } = await props.params;
  const country = await getCountryByCode(code);
  if (!country) return { title: 'Destination inconnue' };

  return {
    title: `Vols vers ${country.name}`,
    description: `Aéroports, formalités d’entrée et meilleurs tarifs pour voyager vers ${country.name}.`,
  };
}

export default async function CountryPage(props: PageProps<'/destinations/[code]'>) {
  const { code } = await props.params;
  const country = await getCountryByCode(code);
  if (!country) notFound();

  const [served, fares, airlines] = await Promise.all([
    listAirports(),
    cheapestToCountry(country.id, 'CDG'),
    airlinesServingCountry(country.id),
  ]);
  const airports = served.filter((airport) => airport.country_id === country.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <nav className="text-sm text-ink-muted">
        <Link href="/destinations" className="hover:text-brand-600">
          Destinations
        </Link>{' '}
        / {country.name}
      </nav>

      <h1 className="mt-2 text-3xl font-bold tracking-tight">{country.name}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {country.continent} · {airports.length} aéroport{airports.length > 1 ? 's' : ''} desservi
        {airports.length > 1 ? 's' : ''}
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Code pays</p>
          <p className="mt-1 text-lg font-bold">{country.code}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Monnaie</p>
          <p className="mt-1 text-lg font-bold">{country.currency}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Indicatif</p>
          <p className="mt-1 text-lg font-bold">{country.phone_code}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Continent</p>
          <p className="mt-1 text-lg font-bold">{country.continent}</p>
        </div>
      </section>

      {country.visa_note ? (
        <section className="card mt-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Formalités d’entrée
          </h2>
          <p className="mt-2 text-sm">{country.visa_note}</p>
          <p className="mt-2 text-xs text-ink-muted">
            Information donnée à titre indicatif pour un voyageur au départ de France. Vérifiez les
            règles applicables à votre nationalité avant le départ.
          </p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Aéroports desservis</h2>
        <div className="table-wrap mt-4">
          <table className="table">
            <thead>
              <tr>
                <th>IATA</th>
                <th>Aéroport</th>
                <th>Ville</th>
                <th>Fuseau horaire</th>
                <th>Coordonnées</th>
              </tr>
            </thead>
            <tbody>
              {airports.map((airport) => (
                <tr key={airport.id}>
                  <td className="font-mono font-semibold">{airport.iata}</td>
                  <td>{airport.name}</td>
                  <td>{airport.city}</td>
                  <td className="text-xs text-ink-muted">{airport.timezone}</td>
                  <td className="text-xs tabular-nums text-ink-muted">
                    {airport.latitude.toFixed(2)}, {airport.longitude.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {fares.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Meilleurs tarifs au départ de Paris (CDG)</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fares.map((fare) => (
              <Link
                key={fare.airport_id}
                href={`/vols?from=CDG&to=${fare.iata}&date=${today()}&cabine=economy&adultes=1&enfants=0&bebes=0`}
                className="card p-4 transition-colors hover:border-brand-400"
              >
                <p className="font-semibold">{fare.city}</p>
                <p className="font-mono text-xs text-ink-muted">CDG → {fare.iata}</p>
                <p className="mt-3 text-sm text-ink-muted">
                  dès <span className="text-base font-bold text-ink">{formatPrice(fare.price)}</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {airlines.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Compagnies desservant {country.name}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {airlines.map((airline) => (
              <span key={airline.iata} className="badge">
                {airline.name} · {airline.flights} vols
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
