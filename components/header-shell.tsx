'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

/**
 * Owns the mobile disclosure state only. The bar and the panel are rendered on
 * the server and handed over as props, so their markup never ships as JS.
 */
export function HeaderShell({ bar, panel }: { bar: ReactNode; panel: ReactNode }) {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface-raised/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        {bar}
        <button
          type="button"
          className="btn btn-ghost -ml-2 px-2.5 md:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpenedOn(open ? null : pathname)}
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
          <span className="sr-only">Menu</span>
        </button>
      </div>

      {open ? (
        <div id="menu-mobile" className="border-t border-line px-4 py-3 md:hidden">
          {panel}
        </div>
      ) : null}
    </header>
  );
}
