'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HEADER_LINKS } from './header-links';

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="ml-4 hidden items-center gap-1 md:flex">
      {HEADER_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-muted ${
            pathname.startsWith(link.href) ? 'text-brand-600 dark:text-brand-300' : 'text-ink'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
