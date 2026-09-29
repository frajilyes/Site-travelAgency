import Link from 'next/link';
import { SearchForm } from '@/components/search-form';
import { flightCounts, popularDestinations } from '@/lib/queries/flights';
import { getAirportByIata } from '@/lib/queries/reference';
import { formatPrice } from '@/lib/format';

const ADVANTAGES = [
  {
    title: 'Fares priced live',
    text: 'Prices move with distance, travel date and remaining seats — exactly as they do at the airlines.',
    icon: '💶',
  },
  {
    title: 'Seats assigned at booking',
    text: 'Every passenger gets a seat number and an e-ticket they can pull up at any time.',
    icon: '🎫',
  },
  {
    title: 'Transparent cancellation',
    text: 'Full refund up to 7 days before departure, 50% after that, with the seats put back on sale.',
    icon: '🔄',
  },
  {
    title: 'Entry requirements by country',
    text: 'Visa rules, currency, dialling code and timezone are listed for every destination.',
    icon: '🛂',
  },
];

export default async function HomePage() {
  const [paris, destinations, counts] = await Promise.all([
    getAirportByIata('CDG'),
    popularDestinations('CDG', 8),
    flightCounts(),
  ]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-linear-to-br from-brand-700 via-brand-600 to-accent-600">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="max-w-2xl text-white">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {counts.upcoming.toLocaleString('en-GB')} flights to book
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              The whole world, one flight away
            </h1>
            <p className="mt-4 text-base text-white/85 sm:text-lg">
              Compare flights from 27 airlines to 35 countries, book for the whole family and manage
              your tickets from your own account.
            </p>
          </div>

          <div className="mt-8 rounded-2xl bg-surface-raised p-1 shadow-2xl">
            <SearchForm
              defaults={{
                from: paris
                  ? {
                      id: paris.id,
                      iata: paris.iata,
                      city: paris.city,
                      name: paris.name,
                      country_name: paris.country_name,
                    }
                  : null,
              }}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Departing from Paris</h2>
            <p className="mt-1 text-sm text-ink-muted">
              The lowest one-way fares currently available in economy class.
            </p>
          </div>
          <Link href="/destinations" className="btn btn-ghost">
            All destinations
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map((destination) => (
            <Link
              key={destination.destination_id}
              href={`/flights?from=CDG&to=${destination.iata}&date=${new Date().toISOString().slice(0, 10)}&cabin=economy&adults=1&children=0&infants=0`}
              className="card group flex flex-col justify-between p-5 transition-colors hover:border-brand-400"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {destination.country}
                </p>
                <p className="mt-1 text-lg font-semibold group-hover:text-brand-600">
                  {destination.city}
                </p>
                <p className="font-mono text-xs text-ink-muted">CDG → {destination.iata}</p>
              </div>
              <p className="mt-4 text-sm text-ink-muted">
                from <span className="text-base font-bold text-ink">{formatPrice(destination.price)}</span>
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="below-fold border-t border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="text-2xl font-bold tracking-tight">A full agency, not a shop window</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ADVANTAGES.map((advantage) => (
              <div key={advantage.title} className="card p-5">
                <p className="text-2xl" aria-hidden="true">
                  {advantage.icon}
                </p>
                <p className="mt-3 font-semibold">{advantage.title}</p>
                <p className="mt-2 text-sm text-ink-muted">{advantage.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="below-fold mx-auto max-w-7xl px-4 py-12">
        <div className="card grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-3xl font-bold tabular-nums">{counts.total.toLocaleString('en-GB')}</p>
            <p className="text-sm text-ink-muted">scheduled flights</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums">55</p>
            <p className="text-sm text-ink-muted">airports served</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums">27</p>
            <p className="text-sm text-ink-muted">partner airlines</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums">35</p>
            <p className="text-sm text-ink-muted">countries reachable</p>
          </div>
        </div>
      </section>
    </>
  );
}
