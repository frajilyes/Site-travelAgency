'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AirportPicker, type AirportOption } from './airport-picker';
import { CABIN_LABELS, CABIN_CLASSES } from '@/lib/types';

export interface SearchDefaults {
  from?: AirportOption | null;
  to?: AirportOption | null;
  date?: string;
  back?: string;
  cabin?: string;
  adults?: number;
  children?: number;
  infants?: number;
}

/** The flight search form, used on the home page and above the results list. */
export function SearchForm({
  defaults,
  compact = false,
}: {
  defaults?: SearchDefaults;
  compact?: boolean;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [roundTrip, setRoundTrip] = useState(Boolean(defaults?.back));
  const [date, setDate] = useState(defaults?.date ?? today);
  const [back, setBack] = useState(defaults?.back ?? '');
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const from = String(data.get('from') ?? '');
    const to = String(data.get('to') ?? '');

    if (!from || !to) {
      setError('Sélectionnez un aéroport de départ et un aéroport d’arrivée dans la liste.');
      return;
    }
    if (from === to) {
      setError('Le départ et la destination doivent être différents.');
      return;
    }

    const adults = Number(data.get('adultes') ?? 1);
    const kids = Number(data.get('enfants') ?? 0);
    const infants = Number(data.get('bebes') ?? 0);
    if (adults + kids + infants > 9) {
      setError('Neuf passagers maximum par réservation.');
      return;
    }
    if (infants > adults) {
      setError('Chaque bébé doit voyager avec un adulte.');
      return;
    }

    const query = new URLSearchParams({
      from,
      to,
      date: String(data.get('date') ?? today),
      cabine: String(data.get('cabine') ?? 'economy'),
      adultes: String(adults),
      enfants: String(kids),
      bebes: String(infants),
    });
    if (roundTrip && back) query.set('retour', back);

    setError(null);
    router.push(`/vols?${query.toString()}`);
  }

  return (
    <form onSubmit={submit} className={compact ? '' : 'card p-5 shadow-lg'}>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setRoundTrip(false)}
          className={`btn ${roundTrip ? 'btn-ghost' : 'btn-primary'}`}
          aria-pressed={!roundTrip}
        >
          Aller simple
        </button>
        <button
          type="button"
          onClick={() => setRoundTrip(true)}
          className={`btn ${roundTrip ? 'btn-primary' : 'btn-ghost'}`}
          aria-pressed={roundTrip}
        >
          Aller-retour
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AirportPicker name="from" label="Départ" defaultOption={defaults?.from} />
        <AirportPicker name="to" label="Destination" defaultOption={defaults?.to} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="search-date">
            Date d’aller
          </label>
          <input
            id="search-date"
            className="field"
            type="date"
            name="date"
            min={today}
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              if (back && back < event.target.value) setBack(event.target.value);
            }}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="search-back">
            Date de retour
          </label>
          <input
            id="search-back"
            className="field"
            type="date"
            name="retour"
            min={date}
            value={back}
            disabled={!roundTrip}
            onChange={(event) => setBack(event.target.value)}
            required={roundTrip}
          />
        </div>

        <div>
          <label className="label" htmlFor="search-cabin">
            Classe
          </label>
          <select id="search-cabin" className="field" name="cabine" defaultValue={defaults?.cabin ?? 'economy'}>
            {CABIN_CLASSES.map((cabin) => (
              <option key={cabin} value={cabin}>
                {CABIN_LABELS[cabin]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label" htmlFor="search-adults">
              Adultes
            </label>
            <select
              id="search-adults"
              className="field"
              name="adultes"
              defaultValue={String(defaults?.adults ?? 1)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="search-children">
              Enfants
            </label>
            <select
              id="search-children"
              className="field"
              name="enfants"
              defaultValue={String(defaults?.children ?? 0)}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="search-infants">
              Bébés
            </label>
            <select
              id="search-infants"
              className="field"
              name="bebes"
              defaultValue={String(defaults?.infants ?? 0)}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary mt-4 w-full sm:w-auto">
        Rechercher des vols
      </button>
    </form>
  );
}
