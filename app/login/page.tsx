import Link from 'next/link';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth-forms';
import { Alert } from '@/components/ui';
import { isGoogleEnabled } from '@/lib/google-oauth';
import { env } from '@/lib/env';
import { safeRelativePath } from '@/lib/request';

const ERRORS: Record<string, string> = {
  google: 'Signing in with Google failed. Try again or use your password.',
  google_cancelled: 'Google sign-in cancelled.',
  google_email: 'The address on this Google account is not verified.',
  google_unavailable: 'Google sign-in is not configured on this server.',
  account_suspended: 'This account is suspended. Please contact customer service.',
  google_expired: 'The attempt timed out. Start the Google sign-in again.',
  too_many_attempts: 'Too many sign-in attempts. Please wait a few minutes.',
  account_exists:
    'An account with a password already exists for this address. Sign in with your password.',
};

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Access your SkyRoute account to manage your bookings.',
};

export default async function LoginPage(props: PageProps<'/login'>) {
  const params = await props.searchParams;
  const next = safeRelativePath(params.next) ?? undefined;
  const error = typeof params.error === 'string' ? ERRORS[params.error] : undefined;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Find your bookings, your tickets and your travel details.
      </p>

      {error ? (
        <div className="mt-6">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="card mt-6 p-6">
        <LoginForm next={next} google={isGoogleEnabled()} />
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        Don’t have an account yet?{' '}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
          className="font-medium text-brand-600 hover:underline"
        >
          Create an account
        </Link>
      </p>

      {env.SEED_DEMO_ACCOUNTS ? (
        <div className="card mt-6 p-4 text-xs text-ink-muted">
          <p className="font-semibold text-ink">Demonstration accounts</p>
          <p className="mt-2">
            Administrator: <span className="font-mono">admin@skyroute.fr</span> /{' '}
            <span className="font-mono">Admin.SkyRoute2026</span>
          </p>
          <p>
            Customer: <span className="font-mono">client@skyroute.fr</span> /{' '}
            <span className="font-mono">Client.SkyRoute2026</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
