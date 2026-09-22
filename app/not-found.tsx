import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <p className="text-6xl" aria-hidden="true">
        🧭
      </p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Page introuvable</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Cette page n’existe pas, ou la réservation demandée ne vous appartient pas.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/" className="btn btn-primary">
          Retour à l’accueil
        </Link>
        <Link href="/vols" className="btn btn-ghost">
          Rechercher un vol
        </Link>
      </div>
    </div>
  );
}
