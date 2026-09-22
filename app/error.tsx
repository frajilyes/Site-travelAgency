'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <p className="text-6xl" aria-hidden="true">
        ⚠️
      </p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Une erreur est survenue</h1>
      <p className="mt-2 text-sm text-ink-muted">
        L’opération n’a pas pu aboutir. Vous pouvez réessayer ; si le problème persiste, contactez le
        service client.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-ink-muted">Référence : {error.digest}</p>
      ) : null}
      <button type="button" onClick={reset} className="btn btn-primary mt-6">
        Réessayer
      </button>
    </div>
  );
}
