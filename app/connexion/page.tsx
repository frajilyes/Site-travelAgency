import Link from 'next/link';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth-forms';
import { Alert } from '@/components/ui';
import { isGoogleEnabled } from '@/lib/google-oauth';

/** Failures of the Google round trip come back as `?error=` on this page. */
const ERRORS: Record<string, string> = {
  google: 'La connexion avec Google a échoué. Réessayez ou utilisez votre mot de passe.',
  google_annule: 'Connexion avec Google annulée.',
  google_email: "L'adresse de ce compte Google n'est pas vérifiée.",
  google_indisponible: "La connexion avec Google n'est pas configurée sur ce serveur.",
  compte_suspendu: 'Ce compte est suspendu. Contactez le service client.',
};

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Accédez à votre espace SkyRoute pour gérer vos réservations.',
};

export default async function LoginPage(props: PageProps<'/connexion'>) {
  const params = await props.searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  const error = typeof params.error === 'string' ? ERRORS[params.error] : undefined;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Connexion</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Retrouvez vos réservations, vos billets et vos informations de voyage.
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
        Pas encore de compte ?{' '}
        <Link
          href={next ? `/inscription?next=${encodeURIComponent(next)}` : '/inscription'}
          className="font-medium text-brand-600 hover:underline"
        >
          Créer un compte
        </Link>
      </p>

      <div className="card mt-6 p-4 text-xs text-ink-muted">
        <p className="font-semibold text-ink">Comptes de démonstration</p>
        <p className="mt-2">
          Administrateur : <span className="font-mono">admin@skyroute.fr</span> /{' '}
          <span className="font-mono">Admin@2026</span>
        </p>
        <p>
          Client : <span className="font-mono">client@skyroute.fr</span> /{' '}
          <span className="font-mono">Client@2026</span>
        </p>
      </div>
    </div>
  );
}
