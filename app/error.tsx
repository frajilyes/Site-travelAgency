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
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-muted">
        The operation could not be completed. You can try again; if the problem persists, please
        contact customer service.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-ink-muted">Reference: {error.digest}</p>
      ) : null}
      <button type="button" onClick={reset} className="btn btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
