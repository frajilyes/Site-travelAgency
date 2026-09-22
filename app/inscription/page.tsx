import Link from 'next/link';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth-forms';
import { isGoogleEnabled } from '@/lib/google-oauth';

export const metadata: Metadata = {
  title: 'Créer un compte',
  description: 'Créez votre compte SkyRoute pour réserver vos vols et suivre vos voyages.',
};

export default async function RegisterPage(props: PageProps<'/inscription'>) {
  const params = await props.searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Créer un compte</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Un compte suffit pour réserver, suivre vos vols et annuler en ligne.
      </p>

      <div className="card mt-6 p-6">
        <RegisterForm next={next} google={isGoogleEnabled()} />
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        Vous avez déjà un compte ?{' '}
        <Link
          href={next ? `/connexion?next=${encodeURIComponent(next)}` : '/connexion'}
          className="font-medium text-brand-600 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
