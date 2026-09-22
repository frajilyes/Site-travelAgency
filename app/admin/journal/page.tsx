import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui';
import { listAuditLogs } from '@/lib/queries/users';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Journal des opérations' };

export default async function AuditLogPage() {
  const logs = await listAuditLogs(200);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal des opérations"
        subtitle="Les 200 dernières actions enregistrées : connexions, réservations, modifications et suppressions."
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Auteur</th>
              <th>Action</th>
              <th>Entité</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink-muted">
                  Aucune opération enregistrée.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="text-xs">{log.actor ?? 'Système'}</td>
                  <td>
                    <span className="badge font-mono">{log.action}</span>
                  </td>
                  <td className="text-xs text-ink-muted">
                    {log.entity}
                    {log.entity_id ? ` #${log.entity_id}` : ''}
                  </td>
                  <td className="text-xs">{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
