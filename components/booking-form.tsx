'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { book } from '@/actions/booking';
import { FieldError } from './ui';
import type { ActionState } from '@/lib/validation';
import type { CabinClass, Country, PassengerType, PublicUser } from '@/lib/types';

const TYPE_LABELS: Record<PassengerType, string> = {
  adult: 'Adulte (12 ans et plus)',
  child: 'Enfant (2 à 11 ans)',
  infant: 'Bébé (moins de 2 ans)',
};

function SubmitButton({ total }: { total: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? 'Paiement en cours…' : `Payer ${total} et confirmer`}
    </button>
  );
}

export function BookingForm({
  outboundFlightId,
  returnFlightId,
  cabin,
  counts,
  countries,
  user,
  totalLabel,
  defaultNationalityId,
}: {
  outboundFlightId: number;
  returnFlightId: number | null;
  cabin: CabinClass;
  counts: { adults: number; children: number; infants: number };
  countries: Country[];
  user: PublicUser;
  totalLabel: string;
  defaultNationalityId: number | undefined;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(book, {});
  const [method, setMethod] = useState<'card' | 'paypal' | 'bank_transfer'>('card');

  const rows: PassengerType[] = [
    ...Array<PassengerType>(counts.adults).fill('adult'),
    ...Array<PassengerType>(counts.children).fill('child'),
    ...Array<PassengerType>(counts.infants).fill('infant'),
  ];

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="outbound_flight_id" value={outboundFlightId} />
      <input type="hidden" name="return_flight_id" value={returnFlightId ?? ''} />
      <input type="hidden" name="cabin" value={cabin} />

      {state.message ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Passagers</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Saisissez les noms exactement comme sur le passeport de chaque voyageur.
        </p>

        <div className="mt-4 space-y-5">
          {rows.map((type, index) => (
            <fieldset key={index} className="rounded-xl border border-line p-4">
              <legend className="px-2 text-sm font-semibold">
                Passager {index + 1} — {TYPE_LABELS[type]}
              </legend>
              <input type="hidden" name="passenger_type" value={type} />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="label" htmlFor={`first-${index}`}>
                    Prénom
                  </label>
                  <input
                    id={`first-${index}`}
                    className="field"
                    name="first_name"
                    required
                    autoComplete="off"
                    defaultValue={index === 0 ? user.first_name : ''}
                  />
                  <FieldError messages={errors[`passenger.${index}.first_name`]} />
                </div>

                <div>
                  <label className="label" htmlFor={`last-${index}`}>
                    Nom
                  </label>
                  <input
                    id={`last-${index}`}
                    className="field"
                    name="last_name"
                    required
                    autoComplete="off"
                    defaultValue={index === 0 ? user.last_name : ''}
                  />
                  <FieldError messages={errors[`passenger.${index}.last_name`]} />
                </div>

                <div>
                  <label className="label" htmlFor={`gender-${index}`}>
                    Civilité
                  </label>
                  <select id={`gender-${index}`} className="field" name="gender" defaultValue="M">
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="X">Non spécifié</option>
                  </select>
                  <FieldError messages={errors[`passenger.${index}.gender`]} />
                </div>

                <div>
                  <label className="label" htmlFor={`dob-${index}`}>
                    Date de naissance
                  </label>
                  <input
                    id={`dob-${index}`}
                    className="field"
                    type="date"
                    name="date_of_birth"
                    max={new Date().toISOString().slice(0, 10)}
                    required
                  />
                  <FieldError messages={errors[`passenger.${index}.date_of_birth`]} />
                  <FieldError messages={errors[`passenger.${index}.passenger_type`]} />
                </div>

                <div>
                  <label className="label" htmlFor={`nationality-${index}`}>
                    Nationalité
                  </label>
                  <select
                    id={`nationality-${index}`}
                    className="field"
                    name="nationality_id"
                    defaultValue={defaultNationalityId ?? ''}
                    required
                  >
                    <option value="" disabled>
                      Choisir un pays
                    </option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <FieldError messages={errors[`passenger.${index}.nationality_id`]} />
                </div>

                <div>
                  <label className="label" htmlFor={`passport-${index}`}>
                    Numéro de passeport
                  </label>
                  <input
                    id={`passport-${index}`}
                    className="field"
                    name="passport_number"
                    required
                    autoComplete="off"
                    placeholder="19FR45872"
                  />
                  <FieldError messages={errors[`passenger.${index}.passport_number`]} />
                </div>

                <div>
                  <label className="label" htmlFor={`expiry-${index}`}>
                    Passeport valable jusqu’au
                  </label>
                  <input
                    id={`expiry-${index}`}
                    className="field"
                    type="date"
                    name="passport_expiry"
                    min={new Date().toISOString().slice(0, 10)}
                    required
                  />
                  <FieldError messages={errors[`passenger.${index}.passport_expiry`]} />
                </div>
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Coordonnées de contact</h2>
        <p className="mt-1 text-sm text-ink-muted">
          La confirmation et les éventuels changements d’horaire y seront envoyés.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="contact_email">
              Adresse e-mail
            </label>
            <input
              id="contact_email"
              className="field"
              type="email"
              name="contact_email"
              defaultValue={user.email}
              required
            />
            <FieldError messages={errors.contact_email} />
          </div>
          <div>
            <label className="label" htmlFor="contact_phone">
              Téléphone
            </label>
            <input
              id="contact_phone"
              className="field"
              name="contact_phone"
              defaultValue={user.phone ?? ''}
              placeholder="+33 6 12 34 56 78"
              required
            />
            <FieldError messages={errors.contact_phone} />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Paiement</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(
            [
              ['card', 'Carte bancaire'],
              ['paypal', 'PayPal'],
              ['bank_transfer', 'Virement bancaire'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
                method === value ? 'border-brand-500 bg-brand-50 dark:bg-brand-950' : 'border-line'
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value={value}
                checked={method === value}
                onChange={() => setMethod(value)}
              />
              {label}
            </label>
          ))}
        </div>

        {method === 'card' ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="card_holder">
                Titulaire de la carte
              </label>
              <input id="card_holder" className="field" name="card_holder" autoComplete="cc-name" />
              <FieldError messages={errors.card_holder} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="card_number">
                Numéro de carte
              </label>
              <input
                id="card_number"
                className="field font-mono"
                name="card_number"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
              />
              <FieldError messages={errors.card_number} />
            </div>
            <div>
              <label className="label" htmlFor="card_expiry">
                Expiration (MM/AA)
              </label>
              <input
                id="card_expiry"
                className="field font-mono"
                name="card_expiry"
                placeholder="12/29"
                autoComplete="cc-exp"
              />
              <FieldError messages={errors.card_expiry} />
            </div>
            <div>
              <label className="label" htmlFor="card_cvc">
                Cryptogramme
              </label>
              <input
                id="card_cvc"
                className="field font-mono"
                name="card_cvc"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
              />
              <FieldError messages={errors.card_cvc} />
            </div>
            <p className="text-xs text-ink-muted sm:col-span-2">
              Démonstration : aucun paiement réel n’est effectué. Le numéro doit simplement passer la
              validation de Luhn, par exemple 4242 4242 4242 4242.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            {method === 'paypal'
              ? 'Vous serez redirigé vers PayPal après la confirmation (simulé dans cette démonstration).'
              : 'Les coordonnées bancaires vous seront envoyées par e-mail. La réservation est maintenue 48 heures.'}
          </p>
        )}
      </section>

      <div className="card p-5">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="accept_terms" className="mt-1" />
          <span>
            J’accepte les conditions de vente, la politique d’annulation et je certifie que les
            informations des passagers correspondent à leurs documents de voyage.
          </span>
        </label>
        <FieldError messages={errors.accept_terms} />

        <div className="mt-4">
          <SubmitButton total={totalLabel} />
        </div>
      </div>
    </form>
  );
}
