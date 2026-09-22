import type { CabinClass } from './types';

const CURRENCY = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

export function formatPrice(amount: number): string {
  return CURRENCY.format(amount);
}

/**
 * Stored timestamps come in two shapes: `YYYY-MM-DDTHH:mm` for the times local
 * to an airport, and `YYYY-MM-DD HH:MM:SS` for the UTC ones (`created_at`,
 * `departure_utc`). Splitting on either separator lets every caller pass a
 * stored value as-is.
 */
const SEPARATOR = /[T ]/;

/**
 * Format a stored timestamp. Values are rendered verbatim rather than shifted
 * by timezone: an airport-local time is already the time the traveller reads.
 */
export function formatDateTime(value: string): string {
  const [date, time] = value.split(SEPARATOR);
  return `${formatDate(date)} à ${(time ?? '').slice(0, 5)}`;
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split(SEPARATOR)[0].split('-');
  return `${day}/${month}/${year}`;
}

export function formatLongDate(value: string): string {
  const d = new Date(`${value.split(SEPARATOR)[0]}T12:00:00Z`);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export function formatTime(value: string): string {
  return (value.split(SEPARATOR)[1] ?? '').slice(0, 5);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}`;
}

export function priceForClass(
  flight: { price_economy: number; price_business: number; price_first: number },
  cabin: CabinClass,
): number {
  if (cabin === 'business') return flight.price_business;
  if (cabin === 'first') return flight.price_first;
  return flight.price_economy;
}

export function seatsForClass(
  flight: { seats_economy: number; seats_business: number; seats_first: number },
  cabin: CabinClass,
): number {
  if (cabin === 'business') return flight.seats_business;
  if (cabin === 'first') return flight.seats_first;
  return flight.seats_economy;
}

/** Parse the stored `YYYY-MM-DD HH:MM:SS` UTC form into a Date. */
export function parseSqlUtc(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

/** Render a Date in the stored, lexically comparable UTC form. */
export function toSqlUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/** `YYYY-MM-DD` for today, used as the minimum selectable travel date. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
