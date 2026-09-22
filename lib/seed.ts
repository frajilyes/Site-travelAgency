import 'server-only';
import type { Collection, Document, Filter, OptionalUnlessRequiredId } from 'mongodb';
import {
  type Doc,
  aircraftCol,
  airlinesCol,
  airportsCol,
  auditLogsCol,
  bookingsCol,
  countriesCol,
  ensureIndexes,
  flightsCol,
  nextId,
  now,
  passengersCol,
  paymentsCol,
  usersCol,
} from './mongodb';
import { AIRCRAFT, AIRLINES, AIRPORTS, COUNTRIES, NETWORK } from './seed-data';
import { hashPassword } from './password';
import { computeQuote, seatLabel } from './pricing';
import { haversine, toSqlUtc, utcToZoned, zonedToUtc } from './geo';
import type { Aircraft, Airline, Airport, CabinClass, Country } from './types';

/** Days of schedule generated ahead of today. */
const HORIZON_DAYS = Number(process.env.SEED_DAYS ?? 28);

/** Documents written per `insertMany` call while generating the schedule. */
const BATCH = 5000;

/** Deterministic PRNG so repeated seeds produce the same schedule. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickAircraft(distance: number, rand: () => number) {
  const usable = AIRCRAFT.filter((a) => a.range_km >= distance * 1.15);
  const pool =
    distance < 1500
      ? usable.filter((a) => a.capacity_economy <= 180)
      : distance < 3500
        ? usable.filter((a) => a.capacity_economy <= 240)
        : distance < 8000
          ? usable.filter((a) => a.capacity_economy >= 236)
          : usable.filter((a) => a.capacity_economy >= 253);
  const list = pool.length > 0 ? pool : usable.length > 0 ? usable : AIRCRAFT;
  return list[Math.floor(rand() * list.length)];
}

function economyFare(distance: number, daysAhead: number, weekday: number, airlineFactor: number) {
  const base = 45 + distance * 0.075;
  const weekend = weekday === 5 || weekday === 0 ? 1.15 : weekday === 6 ? 1.05 : 1;
  const advance = daysAhead < 7 ? 1.35 : daysAhead < 14 ? 1.2 : daysAhead < 30 ? 1.05 : 1;
  return Math.round(base * weekend * advance * airlineFactor * 100) / 100;
}

/**
 * Insert the rows of a reference collection that are not there yet, keyed on a
 * natural code — the equivalent of the old `INSERT OR IGNORE`. Returns the
 * code → key map the schedule generator needs.
 */
async function upsertReference<E extends { id: number }>(
  collection: Collection<Doc<E>>,
  sequence: string,
  key: keyof Omit<E, 'id'> & string,
  rows: Omit<E, 'id'>[],
): Promise<Map<string, number>> {
  const codes = rows.map((row) => (row as Record<string, unknown>)[key]);
  const existing = await collection
    .find({ [key]: { $in: codes } } as Filter<Doc<E>>)
    .toArray();

  const read = (row: unknown) => String((row as Record<string, unknown>)[key]);
  const ids = new Map<string, number>(existing.map((row) => [read(row), row._id as number]));

  const missing = rows.filter((row) => !ids.has(read(row)));
  if (missing.length > 0) {
    const first = await nextId(sequence, missing.length);
    const documents = missing.map((row, index) => ({ _id: first + index, ...row }));
    await collection.insertMany(documents as OptionalUnlessRequiredId<Doc<E>>[], { ordered: false });
    for (const document of documents) ids.set(read(document), document._id);
  }
  return ids;
}

/**
 * Fill an empty database with reference data and a flight schedule. Safe to
 * call repeatedly: it returns early when the data is already present.
 */
export async function seedDatabase(): Promise<{ seeded: boolean; flights: number }> {
  const [countries, airports, airlines, aircraft, flights] = await Promise.all([
    countriesCol(),
    airportsCol(),
    airlinesCol(),
    aircraftCol(),
    flightsCol(),
  ]);

  const [countryCount, flightCount] = await Promise.all([
    countries.countDocuments(),
    flights.countDocuments(),
  ]);
  if (countryCount > 0 && flightCount > 0) {
    return { seeded: false, flights: flightCount };
  }

  const countryIds = await upsertReference<Country>(countries, 'countries', 'code', [...COUNTRIES]);

  const airportIds = await upsertReference<Airport>(
    airports,
    'airports',
    'iata',
    AIRPORTS.map(({ country, ...rest }) => ({ ...rest, country_id: countryIds.get(country)! })),
  );

  const airlineIds = await upsertReference<Airline>(
    airlines,
    'airlines',
    'iata',
    AIRLINES.map(({ country, ...rest }) => ({
      ...rest,
      country_id: countryIds.get(country)!,
      active: 1,
    })),
  );

  const aircraftIds = await upsertReference<Aircraft>(aircraft, 'aircraft', 'code', [...AIRCRAFT]);

  const airportByIata = new Map(AIRPORTS.map((a) => [a.iata, a]));
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const timestamp = now();
  let pending: Document[] = [];
  let inserted = 0;

  const flush = async () => {
    if (pending.length === 0) return;
    const first = await nextId('flights', pending.length);
    try {
      await flights.insertMany(
        pending.map((flight, index) => ({ _id: first + index, ...flight })) as never[],
        { ordered: false },
      );
    } catch (error) {
      // Duplicate flight numbers are skipped, as `INSERT OR IGNORE` did.
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    inserted += pending.length;
    pending = [];
  };

  for (const carrier of NETWORK) {
    const airlineId = airlineIds.get(carrier.airline);
    const hub = airportByIata.get(carrier.hub);
    if (!airlineId || !hub) continue;

    const airlineFactor = 0.9 + (hashString(carrier.airline) % 25) / 100;
    let flightNumber = 100;

    for (const destIata of carrier.destinations) {
      const dest = airportByIata.get(destIata);
      if (!dest || dest.iata === hub.iata) continue;

      const distance = haversine(hub.latitude, hub.longitude, dest.latitude, dest.longitude);
      if (distance < 150) continue;

      const rand = mulberry32(hashString(`${carrier.airline}${hub.iata}${destIata}`));
      const plane = pickAircraft(distance, rand);
      const aircraftId = aircraftIds.get(plane.code)!;
      const duration = Math.round((distance / plane.cruise_speed_kmh) * 60) + 35;
      const frequency = distance < 2500 ? 2 : 1;
      const baggage = distance < 2500 ? 23 : 32;

      for (const direction of [0, 1] as const) {
        const origin = direction === 0 ? hub : dest;
        const target = direction === 0 ? dest : hub;
        const originId = airportIds.get(origin.iata)!;
        const targetId = airportIds.get(target.iata)!;

        for (let slot = 0; slot < frequency; slot++) {
          const number = `${carrier.airline}${flightNumber++}`;
          const baseHour = 6 + Math.floor(rand() * 9) + slot * 6;
          const hour = baseHour % 24;
          const minute = Math.floor(rand() * 12) * 5;

          for (let day = 0; day < HORIZON_DAYS; day++) {
            const date = new Date(startOfToday);
            date.setDate(date.getDate() + day);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const localDeparture = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

            const departureUtc = zonedToUtc(localDeparture, origin.timezone);
            if (departureUtc.getTime() < Date.now() + 2 * 3600_000) continue;

            const arrivalUtc = new Date(departureUtc.getTime() + duration * 60_000);
            const localArrival = utcToZoned(arrivalUtc, target.timezone);

            const economy = economyFare(distance, day, date.getDay(), airlineFactor);
            const soldRatio = 0.05 + rand() * 0.45;

            pending.push({
              flight_number: number,
              airline_id: airlineId,
              aircraft_id: aircraftId,
              origin_id: originId,
              destination_id: targetId,
              departure_time: localDeparture,
              arrival_time: localArrival,
              departure_utc: toSqlUtc(departureUtc),
              duration_minutes: duration,
              distance_km: distance,
              price_economy: economy,
              price_business: Math.round(economy * 2.9 * 100) / 100,
              price_first: Math.round(economy * 5.4 * 100) / 100,
              seats_economy: Math.max(0, Math.round(plane.capacity_economy * (1 - soldRatio))),
              seats_business: Math.max(
                0,
                Math.round(plane.capacity_business * (1 - soldRatio * 0.6)),
              ),
              seats_first: Math.round(plane.capacity_first * (1 - soldRatio * 0.5)),
              baggage_kg: baggage,
              status: 'scheduled',
              created_at: timestamp,
            });

            if (pending.length >= BATCH) await flush();
          }
        }
      }
    }
  }

  await flush();
  return { seeded: true, flights: inserted };
}

/** Create the demo accounts and a couple of example bookings. */
export async function seedAccounts(): Promise<void> {
  const [users, countries, airports, flights, bookings, passengers, payments, auditLogs] =
    await Promise.all([
      usersCol(),
      countriesCol(),
      airportsCol(),
      flightsCol(),
      bookingsCol(),
      passengersCol(),
      paymentsCol(),
      auditLogsCol(),
    ]);

  if ((await users.countDocuments()) > 0) return;

  const [adminHash, clientHash] = await Promise.all([
    hashPassword('Admin@2026'),
    hashPassword('Client@2026'),
  ]);

  const timestamp = now();
  const firstUserId = await nextId('users', 2);
  await users.insertMany([
    {
      _id: firstUserId,
      email: 'admin@skyroute.fr',
      password_hash: adminHash,
      google_id: null,
      first_name: 'Sofia',
      last_name: 'Marchetti',
      phone: '+33 1 45 67 89 01',
      role: 'admin',
      status: 'active',
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      _id: firstUserId + 1,
      email: 'client@skyroute.fr',
      password_hash: clientHash,
      google_id: null,
      first_name: 'Lucas',
      last_name: 'Bernard',
      phone: '+33 6 12 34 56 78',
      role: 'user',
      status: 'active',
      created_at: timestamp,
      updated_at: timestamp,
    },
  ]);

  const clientId = firstUserId + 1;
  const france = await countries.findOne({ code: 'FR' });
  if (!france) return;

  const samples: { from: string; to: string; cabin: CabinClass }[] = [
    { from: 'CDG', to: 'JFK', cabin: 'economy' },
    { from: 'CDG', to: 'DXB', cabin: 'business' },
    { from: 'ORY', to: 'CMN', cabin: 'economy' },
  ];

  for (const [index, sample] of samples.entries()) {
    const [origin, destination] = await Promise.all([
      airports.findOne({ iata: sample.from }),
      airports.findOne({ iata: sample.to }),
    ]);
    if (!origin || !destination) continue;

    const flight = await flights.findOne(
      { origin_id: origin._id, destination_id: destination._id, status: 'scheduled' },
      { sort: { departure_utc: 1 } },
    );
    if (!flight) continue;

    const mix = { adult: index === 1 ? 1 : 2, child: 0, infant: 0 };
    const quote = computeQuote(flight, null, sample.cabin, mix);
    const reference = `SKY${String(100000 + index * 4211).slice(0, 6)}`;
    const bookingId = await nextId('bookings');

    await bookings.insertOne({
      _id: bookingId,
      reference,
      user_id: clientId,
      outbound_flight_id: flight._id,
      return_flight_id: null,
      cabin_class: sample.cabin,
      passenger_count: mix.adult,
      base_price: quote.base,
      taxes: quote.taxes,
      total_price: quote.total,
      currency: 'EUR',
      status: 'confirmed',
      contact_email: 'client@skyroute.fr',
      contact_phone: '+33 6 12 34 56 78',
      created_at: timestamp,
      cancelled_at: null,
    });

    const names = [
      ['Lucas', 'Bernard', '1990-04-18', 'M'],
      ['Camille', 'Bernard', '1992-11-03', 'F'],
    ] as const;

    const firstPassengerId = await nextId('passengers', mix.adult);
    await passengers.insertMany(
      Array.from({ length: mix.adult }, (_, p) => {
        const [first, last, dob, gender] = names[p % names.length];
        return {
          _id: firstPassengerId + p,
          booking_id: bookingId,
          first_name: first,
          last_name: last,
          date_of_birth: dob,
          gender,
          nationality_id: france._id,
          passport_number: `19FR${40000 + index * 17 + p}`,
          passport_expiry: '2032-06-30',
          passenger_type: 'adult' as const,
          seat_outbound: seatLabel(sample.cabin, index * 2 + p),
          seat_return: null,
        };
      }),
    );

    const seatField = `seats_${sample.cabin}`;
    await flights.updateOne(
      { _id: flight._id, [seatField]: { $gte: mix.adult } },
      { $inc: { [seatField]: -mix.adult } },
    );

    await payments.insertOne({
      _id: await nextId('payments'),
      booking_id: bookingId,
      amount: quote.total,
      currency: 'EUR',
      method: 'card',
      status: 'paid',
      card_last4: '4242',
      transaction_ref: `TX-${reference}`,
      created_at: timestamp,
    });

    await auditLogs.insertOne({
      _id: await nextId('audit_logs'),
      user_id: clientId,
      action: 'seed.booking',
      entity: 'booking',
      entity_id: String(bookingId),
      details: `Réservation de démonstration ${sample.from} → ${sample.to}`,
      created_at: timestamp,
    });
  }
}

/** Ensure the database is indexed and populated. Called once per server process. */
export async function ensureSeeded(): Promise<void> {
  await ensureIndexes();
  await seedDatabase();
  await seedAccounts();
}
