import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions générales de vente',
  description: 'Conditions de réservation, de paiement, d’annulation et de remboursement.',
};

const SECTIONS = [
  {
    title: '1. Objet',
    body: "Les présentes conditions régissent la vente de titres de transport aérien par SkyRoute, agence de voyages en ligne. Toute réservation implique leur acceptation sans réserve. SkyRoute agit en qualité d'intermédiaire entre le voyageur et la compagnie aérienne qui opère le vol.",
  },
  {
    title: '2. Réservation',
    body: "La réservation est ferme dès la confirmation du paiement. Une référence de dossier de six caractères est attribuée et un billet électronique est mis à disposition dans l'espace client. Les noms des passagers doivent correspondre exactement à ceux figurant sur leurs documents de voyage ; toute divergence peut entraîner un refus d'embarquement.",
  },
  {
    title: '3. Prix et paiement',
    body: "Les prix sont exprimés en euros, toutes taxes comprises. Ils comprennent le tarif du vol, 12 % de taxes et 22 € de redevances aéroportuaires par passager et par segment. Les enfants de 2 à 11 ans bénéficient d'une réduction de 25 % sur le tarif, les bébés de moins de 2 ans paient 10 % du tarif et ne disposent pas de siège. Le paiement s'effectue par carte bancaire, PayPal ou virement.",
  },
  {
    title: '4. Modification',
    body: 'Les billets ne sont pas modifiables en ligne. Toute demande de changement de date, de destination ou de nom doit être adressée au service client, qui procède à une annulation suivie d’une nouvelle réservation aux conditions tarifaires du jour.',
  },
  {
    title: '5. Annulation et remboursement',
    body: "L'annulation s'effectue depuis l'espace client. Le remboursement est intégral si l'annulation intervient plus de 7 jours avant le départ, de 50 % du montant payé entre 7 jours et 24 heures avant le départ, et nul dans les 24 heures précédant le départ. Le remboursement est crédité sur le moyen de paiement d'origine. Les sièges libérés sont immédiatement remis à la vente.",
  },
  {
    title: '6. Annulation par la compagnie',
    body: "En cas d'annulation du vol par la compagnie aérienne, le voyageur est intégralement remboursé ou reporté sur un autre vol sans frais, à son choix. Les droits prévus par le règlement (CE) n° 261/2004 en matière d'indemnisation restent applicables.",
  },
  {
    title: '7. Documents de voyage',
    body: "Il appartient à chaque passager de détenir un passeport en cours de validité ainsi que les visas et autorisations exigés par le pays de destination et les pays de transit. SkyRoute fournit des informations à titre indicatif et ne peut être tenue responsable d'un refus d'embarquement lié à des documents non conformes.",
  },
  {
    title: '8. Bagages',
    body: "Les franchises bagages sont indiquées sur la fiche de chaque vol et rappelées sur le billet électronique. Les bagages hors format ou en surnombre font l'objet d'un supplément réglé directement auprès de la compagnie.",
  },
  {
    title: '9. Données personnelles',
    body: "Les données collectées (identité, coordonnées, documents de voyage) sont nécessaires à l'exécution du contrat de transport et conservées pendant la durée légale. Le voyageur dispose d'un droit d'accès, de rectification et de suppression exerçable depuis son espace client ou auprès du service client.",
  },
  {
    title: '10. Réclamations et droit applicable',
    body: "Toute réclamation doit être adressée au service client dans un délai de 30 jours suivant le vol. Les présentes conditions sont soumises au droit français. À défaut d'accord amiable, les tribunaux français sont compétents.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Conditions générales de vente</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Projet de démonstration — les vols, paiements et remboursements sont simulés dans une base de
        données locale.
      </p>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-base font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
