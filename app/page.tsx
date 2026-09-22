import Link from 'next/link';
import { SearchForm } from '@/components/search-form';
import { flightCounts, popularDestinations } from '@/lib/queries/flights';
import { getAirportByIata } from '@/lib/queries/reference';
import { formatPrice } from '@/lib/format';

const ADVANTAGES = [
  {
    title: 'Tarifs calculés en direct',
    text: "Les prix évoluent selon la distance, la date et les places restantes — exactement comme chez les compagnies.",
    icon: '💶',
  },
  {
    title: 'Sièges attribués à la réservation',
    text: 'Chaque passager reçoit un numéro de siège et un billet électronique consultable à tout moment.',
    icon: '🎫',
  },
  {
    title: 'Annulation transparente',
    text: 'Remboursement intégral jusqu’à 7 jours avant le départ, 50 % ensuite, avec remise en vente des sièges.',
    icon: '🔄',
  },
  {
    title: 'Formalités par pays',
    text: 'Visa, monnaie, indicatif téléphonique et fuseau horaire sont indiqués pour chaque destination.',
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
              {counts.upcoming.toLocaleString('fr-FR')} vols à réserver
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Le monde entier, en un vol
            </h1>
            <p className="mt-4 text-base text-white/85 sm:text-lg">
              Comparez les vols de 27 compagnies vers 35 pays, réservez pour toute la famille et
              gérez vos billets depuis votre espace personnel.
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
            <h2 className="text-2xl font-bold tracking-tight">Au départ de Paris</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Les tarifs aller simple les plus bas actuellement disponibles en classe économique.
            </p>
          </div>
          <Link href="/destinations" className="btn btn-ghost">
            Toutes les destinations
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map((destination) => (
            <Link
              key={destination.destination_id}
              href={`/vols?from=CDG&to=${destination.iata}&date=${new Date().toISOString().slice(0, 10)}&cabine=economy&adultes=1&enfants=0&bebes=0`}
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
                dès <span className="text-base font-bold text-ink">{formatPrice(destination.price)}</span>
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="text-2xl font-bold tracking-tight">Une agence complète, pas une vitrine</h2>
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

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="card grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-3xl font-bold tabular-nums">{counts.total.toLocaleString('fr-FR')}</p>
            <p className="text-sm text-ink-muted">vols programmés</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums">55</p>
            <p className="text-sm text-ink-muted">aéroports desservis</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums">27</p>
            <p className="text-sm text-ink-muted">compagnies partenaires</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums">35</p>
            <p className="text-sm text-ink-muted">pays accessibles</p>
          </div>
        </div>
      </section>
    </>
  );
}
