'use client';

import { useEffect, useId, useRef, useState } from 'react';

export interface AirportOption {
  id: number;
  iata: string;
  city: string;
  name: string;
  country_name: string;
}

export function airportLabel(option: AirportOption): string {
  return `${option.city} (${option.iata}) — ${option.country_name}`;
}

/**
 * Combobox over the airport list. The visible input is free text; the selected
 * IATA code travels in a hidden input so the form submits a stable value.
 */
export function AirportPicker({
  name,
  label,
  defaultOption,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  defaultOption?: AirportOption | null;
  placeholder?: string;
  required?: boolean;
}) {
  const listId = useId();
  const [query, setQuery] = useState(defaultOption ? airportLabel(defaultOption) : '');
  const [code, setCode] = useState(defaultOption?.iata ?? '');
  const [options, setOptions] = useState<AirportOption[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipFetch = useRef(true);

  const term = query.trim();
  // Suggestions are hidden rather than cleared, so the effect never has to call
  // setState synchronously.
  const suggestions = term.length < 2 ? [] : options;

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }
    if (term.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/aeroports?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { airports: AirportOption[] };
        setOptions(data.airports);
        setHighlight(0);
        setOpen(data.airports.length > 0);
      } catch {
        // Aborted or offline: keep the previous suggestions.
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function choose(option: AirportOption) {
    setQuery(airportLabel(option));
    setCode(option.iata);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="label" htmlFor={`${listId}-input`}>
        {label}
      </label>
      <input
        id={`${listId}-input`}
        className="field"
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder ?? 'Ville, aéroport ou code IATA'}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setCode('');
        }}
        onFocus={() => setOpen(suggestions.length > 0)}
        onKeyDown={(event) => {
          if (!open || suggestions.length === 0) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlight((value) => (value + 1) % suggestions.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight((value) => (value - 1 + suggestions.length) % suggestions.length);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            choose(suggestions[Math.min(highlight, suggestions.length - 1)]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      <input type="hidden" name={name} value={code} required={required} />

      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-surface-raised py-1 shadow-lg"
        >
          {suggestions.map((option, index) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(option)}
                className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                  index === highlight ? 'bg-surface-muted' : ''
                }`}
              >
                <span className="font-medium">
                  {option.city} <span className="font-mono text-xs text-ink-muted">{option.iata}</span>
                </span>
                <span className="text-xs text-ink-muted">
                  {option.name} · {option.country_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
