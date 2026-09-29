'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function isDarkNow(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDarkNow, () => false);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost px-2.5"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
    >
      <span aria-hidden="true">{dark ? '☀️' : '🌙'}</span>
    </button>
  );
}
