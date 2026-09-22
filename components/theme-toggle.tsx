'use client';

import { useSyncExternalStore } from 'react';

/** Re-read the theme whenever the `dark` class on <html> changes. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function isDarkNow(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function ThemeToggle() {
  // The inline script in the root layout sets the class before paint; this hook
  // simply mirrors it, so the button label always matches the live theme.
  const dark = useSyncExternalStore(subscribe, isDarkNow, () => false);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // Storage can be unavailable (private mode); the class change still applies.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost px-2.5"
      aria-label={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      title={dark ? 'Thème clair' : 'Thème sombre'}
    >
      <span aria-hidden="true">{dark ? '☀️' : '🌙'}</span>
    </button>
  );
}
