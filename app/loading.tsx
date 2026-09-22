export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-muted" />
      <div className="mt-4 h-4 w-80 animate-pulse rounded bg-surface-muted" />
      <div className="mt-8 space-y-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-surface-muted" />
        ))}
      </div>
    </div>
  );
}
