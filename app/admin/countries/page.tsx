import Link from 'next/link';
import type { Metadata } from 'next';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/ui';
import { removeCountry } from '@/actions/admin';
import { listCountries } from '@/lib/queries/reference';

export const metadata: Metadata = { title: 'Countries' };

export default async function AdminCountriesPage() {
  const countries = await listCountries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Countries"
        subtitle={`${countries.length} countries on file`}
        action={
          <Link href="/admin/countries/new" className="btn btn-primary">
            Add a country
          </Link>
        }
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Continent</th>
              <th>Currency</th>
              <th>Dialling code</th>
              <th>Entry requirements</th>
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
                    <Link href={`/admin/countries/${country.id}`} className="btn btn-ghost px-2 py-1 text-xs">
                      Edit
                    </Link>
                    <ActionButton
                      action={removeCountry}
                      fields={{ id: country.id }}
                      label="Delete"
                      variant="danger"
                      confirmText={`Delete ${country.name}?`}
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
