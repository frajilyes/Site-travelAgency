import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aide et FAQ',
  description:
    'Réponses aux questions fréquentes : réservation, bagages, annulation, remboursement et documents de voyage.',
};

const FAQ = [
  {
    question: 'Comment réserver un vol ?',
    answer:
      'Renseignez le départ, la destination et les dates dans le moteur de recherche, choisissez un vol, puis saisissez les informations des passagers. La réservation est confirmée immédiatement après le paiement et une référence de dossier à six caractères vous est attribuée.',
  },
  {
    question: 'Faut-il un compte pour réserver ?',
    answer:
      'Oui. Le compte permet de retrouver vos billets, de les imprimer et d’annuler en ligne. La création prend moins d’une minute.',
  },
  {
    question: 'Quand mes sièges sont-ils attribués ?',
    answer:
      'Au moment de la réservation. Chaque passager occupant un siège reçoit un numéro de place dans la cabine choisie, visible sur le billet électronique. Les bébés de moins de 2 ans voyagent sur les genoux d’un adulte et n’occupent pas de siège.',
  },
  {
    question: 'Comment annuler et être remboursé ?',
    answer:
      'Depuis la page de votre réservation, bouton « Annuler la réservation ». Le remboursement est intégral jusqu’à 7 jours avant le départ, de 50 % entre 7 jours et 24 heures, et nul dans les 24 heures précédant le vol. Les sièges sont automatiquement remis en vente.',
  },
  {
    question: 'Quels tarifs s’appliquent aux enfants ?',
    answer:
      'Les enfants de 2 à 11 ans bénéficient de 25 % de réduction sur le tarif adulte. Les bébés de moins de 2 ans paient 10 % du tarif. Les taxes et redevances aéroportuaires restent dues pour chaque passager.',
  },
  {
    question: 'Que comprend le prix affiché ?',
    answer:
      'Le tarif du vol, 12 % de taxes et 22 € de redevances aéroportuaires par passager et par segment. Le total exact est détaillé avant le paiement, sans frais ajoutés ensuite.',
  },
  {
    question: 'Quels documents dois-je présenter ?',
    answer:
      'Un passeport en cours de validité pour chaque passager, et le visa éventuellement requis. Chaque fiche pays de la rubrique Destinations rappelle les formalités d’entrée.',
  },
  {
    question: 'Mon vol est annulé par la compagnie, que se passe-t-il ?',
    answer:
      'Le statut du vol passe à « annulé » et le service client vous contacte pour un report ou un remboursement intégral, sans frais.',
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Aide et questions fréquentes</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Tout ce qu’il faut savoir avant, pendant et après votre réservation.
      </p>

      <div className="mt-8 space-y-3">
        {FAQ.map((entry) => (
          <details key={entry.question} className="card p-5">
            <summary className="cursor-pointer font-semibold">{entry.question}</summary>
            <p className="mt-3 text-sm text-ink-muted">{entry.answer}</p>
          </details>
        ))}
      </div>

      <section className="card mt-8 p-6">
        <h2 className="text-lg font-semibold">Besoin d’un conseiller ?</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Notre service client répond du lundi au samedi, de 8 h à 20 h (heure de Paris).
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Téléphone : +33 1 84 88 20 30</li>
          <li>E-mail : contact@skyroute.fr</li>
          <li>Adresse : 18 rue de la Paix, 75002 Paris</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/aide/bagages" className="btn btn-ghost">
            Règles bagages
          </Link>
          <Link href="/conditions" className="btn btn-ghost">
            Conditions de vente
          </Link>
        </div>
      </section>
    </div>
  );
}
