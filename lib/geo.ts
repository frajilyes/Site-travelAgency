
export function haversine(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, fmt);
  }
  return fmt;
}

function partsIn(date: Date, timeZone: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return out;
}

function offsetMs(date: Date, timeZone: string): number {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return asUtc - date.getTime();
}

export function zonedToUtc(local: string, timeZone: string): Date {
  const naive = Date.parse(`${local}:00Z`);
  let ts = naive - offsetMs(new Date(naive), timeZone);
  ts = naive - offsetMs(new Date(ts), timeZone);
  return new Date(ts);
}

export function utcToZoned(date: Date, timeZone: string): string {
  const p = partsIn(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour % 24)}:${pad(p.minute)}`;
}

export function toSqlUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export interface ScheduleInput {
  origin: { latitude: number; longitude: number; timezone: string };
  destination: { latitude: number; longitude: number; timezone: string };
  cruiseSpeedKmh: number;
  departureLocal: string;
}

export interface Schedule {
  distanceKm: number;
  durationMinutes: number;
  arrivalLocal: string;
  departureUtc: string;
}

export function computeSchedule(input: ScheduleInput): Schedule {
  const distanceKm = haversine(
    input.origin.latitude,
    input.origin.longitude,
    input.destination.latitude,
    input.destination.longitude,
  );
  const durationMinutes = Math.round((distanceKm / input.cruiseSpeedKmh) * 60) + 35;
  const departureUtc = zonedToUtc(input.departureLocal, input.origin.timezone);
  const arrivalUtc = new Date(departureUtc.getTime() + durationMinutes * 60_000);

  return {
    distanceKm,
    durationMinutes,
    arrivalLocal: utcToZoned(arrivalUtc, input.destination.timezone),
    departureUtc: toSqlUtc(departureUtc),
  };
}
