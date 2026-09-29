import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui';
import { listAuditLogs } from '@/lib/queries/users';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Audit log' };

export default async function AuditLogPage() {
  const logs = await listAuditLogs(200);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        subtitle="The last 200 recorded actions: successful and refused sign-ins, bookings, changes and deletions."
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Detail</th>
              <th>Origin</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink-muted">
                  No operation recorded.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="text-xs">{log.actor ?? 'System'}</td>
                  <td>
                    <span className="badge font-mono">{log.action}</span>
                  </td>
                  <td className="text-xs text-ink-muted">
                    {log.entity}
                    {log.entity_id ? ` #${log.entity_id}` : ''}
                  </td>
                  <td className="text-xs">{log.details}</td>
                  <td className="font-mono text-xs text-ink-muted">{log.ip ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
