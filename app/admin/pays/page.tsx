import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/ui';
import { removeCountry } from '@/actions/admin';
import { listCountries } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Pays' };

export default async function AdminCountriesPage() {
  const countries = await listCountries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pays"
        subtitle={`${countries.length} pays référencés`}
        action={
          <Link href="/admin/pays/nouveau" className="btn btn-primary">
            Ajouter un pays
          </Link>
        }
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Continent</th>
              <th>Devise</th>
              <th>Indicatif</th>
              <th>Formalités</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {countries.map((country) => (
              <tr key={country.id}>
                <td className="font-mono font-semibold">{country.code}</td>
                <td className="font-medium">{country.name}</td>
                <td>{country.continent}</td>
                <td>{country.currency}</td>
                <td className="tabular-nums">{country.phone_code}</td>
                <td className="max-w-80 text-xs text-ink-muted">{country.visa_note ?? '—'}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/pays/${country.id}`} className="btn btn-ghost px-2 py-1 text-xs">
                      Modifier
                    </Link>
                    <ActionButton
                      action={removeCountry}
                      fields={{ id: country.id }}
                      label="Supprimer"
                      variant="danger"
                      confirmText={`Supprimer ${country.name} ?`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
