import 'server-only';
import { MongoClient, type ClientSession, type Collection, type Db, type Document } from 'mongodb';
import type {
  Aircraft,
  Airline,
  Airport,
  AuditLog,
  Booking,
  Country,
  Flight,
  Passenger,
  Payment,
  User,
} from './types';

const URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.MONGODB_DB ?? 'skyroute';

/**
 * Documents are stored with the numeric key MongoDB calls `_id`, while the rest
 * of the application keeps working with `id`. `fromDoc` and the `$set`/`$unset`
 * pair in `AS_ENTITY` translate between the two.
 */
export type Doc<T extends { id: number }> = Omit<T, 'id'> & { _id: number };

declare global {
  var __travelMongo: Promise<MongoClient> | undefined;
}

// Reuse a single client across hot reloads in development, and across the
// parallel workers `next build` starts, so the pool is never rebuilt per query.
const clientPromise: Promise<MongoClient> =
  globalThis.__travelMongo ?? new MongoClient(URI, { serverSelectionTimeoutMS: 15_000 }).connect();
if (process.env.NODE_ENV !== 'production') globalThis.__travelMongo = clientPromise;

export function getClient(): Promise<MongoClient> {
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  return (await clientPromise).db(DB_NAME);
}

async function col<T extends Document>(name: string): Promise<Collection<T>> {
  return (await getDb()).collection<T>(name);
}

/* ------------------------------------------------------------- collections */

export const countriesCol = () => col<Doc<Country>>('countries');
export const airportsCol = () => col<Doc<Airport>>('airports');
export const airlinesCol = () => col<Doc<Airline>>('airlines');
export const aircraftCol = () => col<Doc<Aircraft>>('aircraft');
export const usersCol = () => col<Doc<User>>('users');
export const flightsCol = () => col<Doc<Flight>>('flights');
export const bookingsCol = () => col<Doc<Booking>>('bookings');
export const passengersCol = () => col<Doc<Passenger>>('passengers');
export const paymentsCol = () => col<Doc<Payment>>('payments');
export const auditLogsCol = () => col<Doc<AuditLog>>('audit_logs');

interface Counter {
  _id: string;
  seq: number;
}
const countersCol = () => col<Counter>('counters');

/* -------------------------------------------------------------------- keys */

/**
 * Reserve `count` consecutive numeric keys for a collection and return the
 * first one. MongoDB has no AUTOINCREMENT, so the sequences live in their own
 * `counters` collection and are bumped with a single atomic update.
 */
export async function nextId(name: string, count = 1, session?: ClientSession): Promise<number> {
  const counters = await countersCol();
  const counter = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: count } },
    { upsert: true, returnDocument: 'after', session },
  );
  // `seq` is the last key of the reserved block; the caller gets the first one.
  return (counter?.seq ?? count) - count + 1;
}

/* ----------------------------------------------------------------- mapping */

/** Turn a stored document into the `{ id, ... }` shape the application uses. */
export function fromDoc<T extends { id: number }>(doc: Doc<T> | null | undefined): T | undefined {
  if (!doc) return undefined;
  const { _id, ...rest } = doc as Doc<T> & { _id: number };
  return { id: _id, ...rest } as unknown as T;
}

export function fromDocs<T extends { id: number }>(docs: Doc<T>[]): T[] {
  return docs.map((doc) => fromDoc<T>(doc)!);
}

/** Closing stages that rename `_id` to `id` in an aggregation. */
export const AS_ENTITY: Document[] = [{ $set: { id: '$_id' } }, { $unset: '_id' }];

/* ----------------------------------------------------------------- helpers */

function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive `LIKE %term%`: the term matches anywhere, literally. */
export function literal(term: string): RegExp {
  return new RegExp(escape(term), 'i');
}

/** Case-insensitive `LIKE term%`. The anchor has to be added after escaping. */
export function startsWith(term: string): RegExp {
  return new RegExp(`^${escape(term)}`, 'i');
}

/** `YYYY-MM-DD HH:MM:SS` in UTC — the comparable form every timestamp uses. */
export function now(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** True when the error is a unique-index violation. */
export function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

/* ------------------------------------------------------------ transactions */

let transactional: boolean | undefined;

/** Multi-document transactions need a replica set or a sharded cluster. */
async function supportsTransactions(): Promise<boolean> {
  if (transactional === undefined) {
    try {
      const hello = await (await getDb()).admin().command({ hello: 1 });
      transactional = Boolean(hello.setName) || hello.msg === 'isdbgrid';
    } catch {
      transactional = false;
    }
  }
  return transactional;
}

/**
 * Run `fn` inside a transaction when the server offers them. A standalone
 * `mongod` does not, so `fn` then receives no session and has to undo its own
 * writes — see `createBooking`, which does exactly that.
 */
export async function withTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
  if (!(await supportsTransactions())) return fn(undefined);

  const session = (await getClient()).startSession();
  try {
    return await session.withTransaction(() => fn(session));
  } finally {
    await session.endSession();
  }
}

/* ----------------------------------------------------------------- indexes */

/**
 * Recreate the constraints the SQL schema expressed with UNIQUE and INDEX.
 * Idempotent: an index that already exists is left alone.
 */
export async function ensureIndexes(): Promise<void> {
  const [countries, airports, airlines, aircraft, users, flights, bookings, passengers, payments, auditLogs] =
    await Promise.all([
      countriesCol(),
      airportsCol(),
      airlinesCol(),
      aircraftCol(),
      usersCol(),
      flightsCol(),
      bookingsCol(),
      passengersCol(),
      paymentsCol(),
      auditLogsCol(),
    ]);

  await Promise.all([
    countries.createIndexes([
      { key: { code: 1 }, unique: true, name: 'uniq_countries_code' },
      { key: { name: 1 }, name: 'idx_countries_name' },
    ]),
    airports.createIndexes([
      { key: { iata: 1 }, unique: true, name: 'uniq_airports_iata' },
      { key: { country_id: 1 }, name: 'idx_airports_country' },
      { key: { city: 1 }, name: 'idx_airports_city' },
    ]),
    airlines.createIndexes([
      { key: { iata: 1 }, unique: true, name: 'uniq_airlines_iata' },
      { key: { name: 1 }, name: 'idx_airlines_name' },
    ]),
    aircraft.createIndexes([{ key: { code: 1 }, unique: true, name: 'uniq_aircraft_code' }]),
    users.createIndexes([
      { key: { email: 1 }, unique: true, name: 'uniq_users_email' },
      // Accounts without Google leave `google_id` null, and many documents do:
      // a partial index keeps the uniqueness constraint off those.
      {
        key: { google_id: 1 },
        unique: true,
        partialFilterExpression: { google_id: { $type: 'string' } },
        name: 'uniq_users_google',
      },
    ]),
    flights.createIndexes([
      {
        key: { flight_number: 1, departure_time: 1 },
        unique: true,
        name: 'uniq_flights_number_departure',
      },
      { key: { origin_id: 1, destination_id: 1, departure_time: 1 }, name: 'idx_flights_route' },
      { key: { departure_time: 1 }, name: 'idx_flights_departure' },
      { key: { departure_utc: 1 }, name: 'idx_flights_departure_utc' },
      // Counting the upcoming scheduled flights is a home-page query. Without
      // `status` in the key it fetches every one of the 50 000+ documents just
      // to filter them; with it, the count never leaves the index.
      { key: { status: 1, departure_utc: 1 }, name: 'idx_flights_status_utc' },
      // `popularDestinations` and `airlinesServingCountry` scan one side of a
      // route over the upcoming window; neither can use the route index.
      { key: { origin_id: 1, departure_utc: 1 }, name: 'idx_flights_origin_utc' },
      { key: { destination_id: 1, departure_utc: 1 }, name: 'idx_flights_destination_utc' },
      { key: { airline_id: 1 }, name: 'idx_flights_airline' },
      { key: { aircraft_id: 1 }, name: 'idx_flights_aircraft' },
    ]),
    bookings.createIndexes([
      { key: { reference: 1 }, unique: true, name: 'uniq_bookings_reference' },
      { key: { user_id: 1 }, name: 'idx_bookings_user' },
      { key: { status: 1 }, name: 'idx_bookings_status' },
      { key: { outbound_flight_id: 1 }, name: 'idx_bookings_outbound' },
      { key: { return_flight_id: 1 }, name: 'idx_bookings_return' },
      { key: { created_at: -1 }, name: 'idx_bookings_created' },
    ]),
    passengers.createIndexes([
      { key: { booking_id: 1 }, name: 'idx_passengers_booking' },
      { key: { nationality_id: 1 }, name: 'idx_passengers_nationality' },
    ]),
    payments.createIndexes([
      { key: { transaction_ref: 1 }, unique: true, name: 'uniq_payments_transaction' },
      { key: { booking_id: 1 }, name: 'idx_payments_booking' },
    ]),
    auditLogs.createIndexes([{ key: { created_at: -1 }, name: 'idx_audit_created' }]),
  ]);
}
