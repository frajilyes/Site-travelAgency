import Link from 'next/link';
import type { Metadata } from 'next';
import { destinationCountries } from '@/lib/queries/reference';

export const metadata: Metadata = {
  title: 'Destinations',
  description:
    'Tous les pays desservis par SkyRoute, avec leurs aéroports, leur monnaie et les formalités d’entrée.',
};

export default async function DestinationsPage() {
  const countries = await destinationCountries();
  const continents = [...new Set(countries.map((country) => country.continent))];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Nos destinations</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {countries.length} pays desservis, {countries.reduce((sum, c) => sum + c.airports, 0)}{' '}
        aéroports. Chaque fiche pays indique la monnaie, l’indicatif téléphonique et les formalités
        d’entrée.
      </p>

      <div className="mt-8 space-y-10">
        {continents.map((continent) => (
          <section key={continent}>
            <h2 className="text-lg font-semibold">{continent}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {countries
                .filter((country) => country.continent === continent)
                .map((country) => (
                  <Link
                    key={country.id}
                    href={`/destinations/${country.code}`}
                    className="card p-4 transition-colors hover:border-brand-400"
                  >
                    <p className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{country.name}</span>
                      <span className="badge">{country.code}</span>
                    </p>
                    <p className="mt-2 text-xs text-ink-muted">
                      {country.airports} aéroport{country.airports > 1 ? 's' : ''} ·{' '}
                      {country.cities.split(',').slice(0, 3).join(', ')}
                    </p>
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
