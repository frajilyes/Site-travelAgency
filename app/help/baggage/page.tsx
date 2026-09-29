import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Baggage',
  description: 'Baggage allowances by cabin, permitted dimensions and prohibited items.',
};

const ALLOWANCES = [
  {
    cabin: 'Economy',
    cabinBag: '1 cabin bag up to 8 kg (55 × 40 × 20 cm) + 1 personal item',
    hold: '1 bag up to 23 kg (short and medium haul) or 32 kg (long haul)',
    extra: '€60 per additional bag',
  },
  {
    cabin: 'Business',
    cabinBag: '2 cabin bags up to 12 kg in total + 1 personal item',
    hold: '2 bags up to 32 kg',
    extra: '€80 per additional bag',
  },
  {
    cabin: 'First',
    cabinBag: '2 cabin bags up to 15 kg in total + 1 personal item',
    hold: '3 bags up to 32 kg',
    extra: '€100 per additional bag',
  },
];

const FORBIDDEN = [
  'Lithium batteries over 160 Wh',
  'Explosives, ammunition and pyrotechnics',
  'Compressed gases and flammable aerosols',
  'Liquids over 100 ml in the cabin',
  'Sharp objects in the cabin (knives, long-bladed scissors)',
  'Corrosive or toxic substances',
];

export default function BaggagePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav className="text-sm text-ink-muted">
        <Link href="/help" className="hover:text-brand-600">
          Help
        </Link>{' '}
        / Baggage
      </nav>

      <h1 className="mt-2 text-2xl font-bold tracking-tight">Baggage allowances</h1>
      <p className="mt-1 text-sm text-ink-muted">
        The exact allowance for your flight is shown on the flight details and on your e-ticket.
      </p>

      <div className="table-wrap mt-6">
        <table className="table">
          <thead>
            <tr>
              <th>Cabin</th>
              <th>In the cabin</th>
              <th>In the hold</th>
              <th>Additional bag</th>
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
        <h2 className="text-lg font-semibold">Prohibited items</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-ink-muted">
          {FORBIDDEN.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="card mt-4 p-6">
        <h2 className="text-lg font-semibold">Special baggage</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Musical instruments, sports equipment and pets must be declared to customer service at
          least 48 hours before departure. Fees and per-aircraft restrictions may apply.
        </p>
      </section>
    </div>
  );
}
