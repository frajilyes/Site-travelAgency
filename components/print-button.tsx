'use client';

export function PrintButton({ label = 'Print ticket' }: { label?: string }) {
  return (
    <button type="button" className="btn btn-ghost print:hidden" onClick={() => window.print()}>
      {label}
    </button>
  );
}
