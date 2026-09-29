import type { CabinClass, PassengerType } from './types';
import { parseSqlUtc, priceForClass } from './format';

export const TAX_RATE = 0.12;
export const AIRPORT_FEE = 22;

export const FARE_MULTIPLIER: Record<PassengerType, number> = {
  adult: 1,
  child: 0.75,
  infant: 0.1,
};

export interface PassengerMix {
  adult: number;
  child: number;
  infant: number;
}

export interface Quote {
  base: number;
  taxes: number;
  total: number;
  segments: number;
  seats: number;
  billablePassengers: number;
}

type Priced = { price_economy: number; price_business: number; price_first: number };

export function totalPassengers(mix: PassengerMix): number {
  return mix.adult + mix.child + mix.infant;
}

export function seatsNeeded(mix: PassengerMix): number {
  return mix.adult + mix.child;
}

export function computeQuote(
  outbound: Priced,
  returnFlight: Priced | null,
  cabin: CabinClass,
  mix: PassengerMix,
): Quote {
  const segments = returnFlight ? 2 : 1;
  const fares = [outbound, ...(returnFlight ? [returnFlight] : [])];

  let base = 0;
  for (const flight of fares) {
    const seatPrice = priceForClass(flight, cabin);
    base += seatPrice * FARE_MULTIPLIER.adult * mix.adult;
    base += seatPrice * FARE_MULTIPLIER.child * mix.child;
    base += seatPrice * FARE_MULTIPLIER.infant * mix.infant;
  }

  const people = totalPassengers(mix);
  const taxes = base * TAX_RATE + AIRPORT_FEE * people * segments;

  return {
    base: round(base),
    taxes: round(taxes),
    total: round(base + taxes),
    segments,
    seats: seatsNeeded(mix),
    billablePassengers: people,
  };
}

export function refundRate(departureUtc: string, now: Date = new Date()): number {
  const departure = parseSqlUtc(departureUtc).getTime();
  const hours = (departure - now.getTime()) / 3_600_000;
  if (hours >= 24 * 7) return 1;
  if (hours >= 24) return 0.5;
  return 0;
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

const LETTERS: Record<CabinClass, string[]> = {
  first: ['A', 'B'],
  business: ['A', 'C', 'D', 'F'],
  economy: ['A', 'B', 'C', 'D', 'E', 'F'],
};

const FIRST_ROW: Record<CabinClass, number> = { first: 1, business: 4, economy: 13 };

export function seatLabel(cabin: CabinClass, index: number): string {
  const letters = LETTERS[cabin];
  const row = FIRST_ROW[cabin] + Math.floor(index / letters.length);
  return `${row}${letters[index % letters.length]}`;
}
