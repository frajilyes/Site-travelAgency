import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <p className="text-6xl" aria-hidden="true">
        🧭
      </p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This page does not exist, or the booking you asked for is not yours.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
        <Link href="/flights" className="btn btn-ghost">
          Search flights
        </Link>
      </div>
    </div>
  );
}
