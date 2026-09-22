import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bagages',
  description: 'Franchises bagages par cabine, dimensions autorisées et objets interdits.',
};

const ALLOWANCES = [
  {
    cabin: 'Économique',
    cabinBag: '1 bagage à main de 8 kg (55 × 40 × 20 cm) + 1 accessoire',
    hold: '1 bagage de 23 kg (court et moyen-courrier) ou 32 kg (long-courrier)',
    extra: '60 € par bagage supplémentaire',
  },
  {
    cabin: 'Affaires',
    cabinBag: '2 bagages à main de 12 kg au total + 1 accessoire',
    hold: '2 bagages de 32 kg',
    extra: '80 € par bagage supplémentaire',
  },
  {
    cabin: 'Première',
    cabinBag: '2 bagages à main de 15 kg au total + 1 accessoire',
    hold: '3 bagages de 32 kg',
    extra: '100 € par bagage supplémentaire',
  },
];

const FORBIDDEN = [
  'Batteries au lithium de plus de 160 Wh',
  'Explosifs, munitions et articles pyrotechniques',
  'Gaz comprimés, aérosols inflammables',
  'Liquides de plus de 100 ml en cabine',
  'Objets tranchants en cabine (couteaux, ciseaux à lames longues)',
  'Matières corrosives ou toxiques',
];

export default function BaggagePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav className="text-sm text-ink-muted">
        <Link href="/aide" className="hover:text-brand-600">
          Aide
        </Link>{' '}
        / Bagages
      </nav>

      <h1 className="mt-2 text-2xl font-bold tracking-tight">Franchises bagages</h1>
      <p className="mt-1 text-sm text-ink-muted">
        La franchise exacte de votre vol est indiquée sur la fiche du vol et sur votre billet
        électronique.
      </p>

      <div className="table-wrap mt-6">
        <table className="table">
          <thead>
            <tr>
              <th>Cabine</th>
              <th>En cabine</th>
              <th>En soute</th>
              <th>Bagage supplémentaire</th>
            </tr>
          </thead>
          <tbody>
            {ALLOWANCES.map((row) => (
              <tr key={row.cabin}>
                <td className="font-semibold">{row.cabin}</td>
                <td>{row.cabinBag}</td>
                <td>{row.hold}</td>
                <td>{row.extra}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card mt-8 p-6">
        <h2 className="text-lg font-semibold">Articles interdits</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-ink-muted">
          {FORBIDDEN.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="card mt-4 p-6">
        <h2 className="text-lg font-semibold">Bagages spéciaux</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Instruments de musique, équipements sportifs et animaux de compagnie doivent être déclarés
          au moins 48 heures avant le départ auprès du service client. Des frais et des restrictions
          par appareil peuvent s’appliquer.
        </p>
      </section>
    </div>
  );
}
