import Link from 'next/link';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth-forms';
import { isGoogleEnabled } from '@/lib/google-oauth';
import { safeRelativePath } from '@/lib/request';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create your SkyRoute account to book flights and follow your trips.',
};

export default async function RegisterPage(props: PageProps<'/register'>) {
  const params = await props.searchParams;
  const next = safeRelativePath(params.next) ?? undefined;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
      <p className="mt-1 text-sm text-ink-muted">
        One account is all you need to book, follow your flights and cancel online.
      </p>

      <div className="card mt-6 p-6">
        <RegisterForm next={next} google={isGoogleEnabled()} />
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        Already have an account?{' '}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="font-medium text-brand-600 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
