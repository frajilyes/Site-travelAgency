import Link from 'next/link';
import type { ReactNode } from 'react';
import type { BookingStatus, FlightStatus } from '@/lib/types';
import { BOOKING_STATUS_LABELS, FLIGHT_STATUS_LABELS } from '@/lib/types';

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
      {messages[0]}
    </p>
  );
}

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'error';
  children: ReactNode;
}) {
  const styles = {
    info: 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-100',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
    error:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`} role="status">
      {children}
    </div>
  );
}

export function BookingBadge({ status }: { status: BookingStatus }) {
  const tone =
    status === 'confirmed'
      ? 'badge-success'
      : status === 'cancelled'
        ? 'badge-danger'
        : status === 'completed'
          ? 'badge-info'
          : 'badge-warning';
  return <span className={`badge ${tone}`}>{BOOKING_STATUS_LABELS[status]}</span>;
}

export function FlightBadge({ status }: { status: FlightStatus }) {
  const tone =
    status === 'scheduled'
      ? 'badge-success'
      : status === 'cancelled'
        ? 'badge-danger'
        : status === 'delayed'
          ? 'badge-warning'
          : 'badge-info';
  return <span className={`badge ${tone}`}>{FLIGHT_STATUS_LABELS[status]}</span>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-base font-semibold">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-ink-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function Pagination({
  page,
  perPage,
  total,
  basePath,
  params,
}: {
  page: number;
  perPage: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    query.set('page', String(target));
    return `${basePath}?${query.toString()}`;
  };

  return (
    <nav className="flex items-center justify-between gap-4 text-sm" aria-label="Pagination">
      <p className="text-ink-muted">
        Page {page} of {pages} — {total.toLocaleString('en-GB')} result
        {total > 1 ? 's' : ''}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="btn btn-ghost" href={href(page - 1)}>
            Previous
          </Link>
        ) : (
          <span className="btn btn-ghost opacity-40">Previous</span>
        )}
        {page < pages ? (
          <Link className="btn btn-ghost" href={href(page + 1)}>
            Next
          </Link>
        ) : (
          <span className="btn btn-ghost opacity-40">Next</span>
        )}
      </div>
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
