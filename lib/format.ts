import type { CabinClass } from './types';

const CURRENCY = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

export function formatPrice(amount: number): string {
  return CURRENCY.format(amount);
}

const SEPARATOR = /[T ]/;

export function formatDateTime(value: string): string {
  const [date, time] = value.split(SEPARATOR);
  return `${formatDate(date)} at ${(time ?? '').slice(0, 5)}`;
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split(SEPARATOR)[0].split('-');
  return `${day}/${month}/${year}`;
}

export function formatLongDate(value: string): string {
  const d = new Date(`${value.split(SEPARATOR)[0]}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
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
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
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

export function parseSqlUtc(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

export function toSqlUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
