import 'server-only';
import type { Document } from 'mongodb';
import {
  AS_ENTITY,
  airportsCol,
  bookingsCol,
  flightsCol,
  literal,
  nextId,
  now,
} from '../mongodb';
import type { CabinClass, Flight, FlightDetail, FlightStatus } from '../types';

/**
 * Resolves the airline, the aircraft, both airports and their countries —
 * the six JOINs the SQL version carried on every flight query. Always applied
 * *after* the matching and pagination stages, so only the returned flights are
 * joined.
 */
const FLIGHT_DETAIL: Document[] = [
  { $lookup: { from: 'airlines', localField: 'airline_id', foreignField: '_id', as: 'al' } },
  { $lookup: { from: 'aircraft', localField: 'aircraft_id', foreignField: '_id', as: 'ac' } },
  { $lookup: { from: 'airports', localField: 'origin_id', foreignField: '_id', as: 'o' } },
  { $lookup: { from: 'airports', localField: 'destination_id', foreignField: '_id', as: 'd' } },
  { $unwind: '$al' },
  { $unwind: '$ac' },
  { $unwind: '$o' },
  { $unwind: '$d' },
  { $lookup: { from: 'countries', localField: 'o.country_id', foreignField: '_id', as: 'oc' } },
  { $lookup: { from: 'countries', localField: 'd.country_id', foreignField: '_id', as: 'dc' } },
  { $unwind: '$oc' },
  { $unwind: '$dc' },
  {
    $set: {
      airline_name: '$al.name',
      airline_iata: '$al.iata',
      aircraft_model: '$ac.model',
      aircraft_manufacturer: '$ac.manufacturer',
      origin_iata: '$o.iata',
      origin_city: '$o.city',
      origin_name: '$o.name',
      origin_country: '$oc.name',
      destination_iata: '$d.iata',
      destination_city: '$d.city',
      destination_name: '$d.name',
      destination_country: '$dc.name',
    },
  },
  { $unset: ['al', 'ac', 'o', 'd', 'oc', 'dc'] },
];

async function detailed(stages: Document[]): Promise<FlightDetail[]> {
  const flights = await flightsCol();
  return flights.aggregate<FlightDetail>([...stages, ...FLIGHT_DETAIL, ...AS_ENTITY]).toArray();
}

export interface SearchCriteria {
  originId: number;
  destinationId: number;
  date: string;
  cabin: CabinClass;
  seats: number;
  airlineId?: number;
  maxPrice?: number;
  sort?: 'price' | 'duration' | 'departure';
}

/**
 * Flights leaving `originId` on `date` (local to the departure airport) with
 * enough seats left in the requested cabin.
 */
export async function searchFlights(criteria: SearchCriteria): Promise<FlightDetail[]> {
  const { cabin, seats, sort = 'price' } = criteria;
  const seatField = `seats_${cabin}`;
  const priceField = `price_${cabin}`;

  const filter: Document = {
    origin_id: criteria.originId,
    destination_id: criteria.destinationId,
    departure_time: { $gte: `${criteria.date}T00:00`, $lte: `${criteria.date}T23:59` },
    status: { $in: ['scheduled', 'delayed'] },
    [seatField]: { $gte: seats },
    departure_utc: { $gt: now() },
  };

  if (criteria.airlineId) filter.airline_id = criteria.airlineId;
  if (criteria.maxPrice !== undefined) filter[priceField] = { $lte: criteria.maxPrice };

  const order: Document =
    sort === 'duration'
      ? { duration_minutes: 1 }
      : sort === 'departure'
        ? { departure_time: 1 }
        : { [priceField]: 1 };

  return detailed([{ $match: filter }, { $sort: order }, { $limit: 60 }]);
}

export async function getFlight(id: number): Promise<FlightDetail | undefined> {
  const [flight] = await detailed([{ $match: { _id: id } }]);
  return flight;
}

/** Cheapest fare per day around `date`, used by the flexible-dates strip. */
export async function priceCalendar(
  originId: number,
  destinationId: number,
  date: string,
  cabin: CabinClass,
  span = 3,
): Promise<{ date: string; price: number }[]> {
  const from = new Date(`${date}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - span);
  const to = new Date(`${date}T12:00:00Z`);
  to.setUTCDate(to.getUTCDate() + span);

  const flights = await flightsCol();
  const rows = await flights
    .aggregate<{ _id: string; price: number }>([
      {
        $match: {
          origin_id: originId,
          destination_id: destinationId,
          departure_time: {
            $gte: `${from.toISOString().slice(0, 10)}T00:00`,
            $lte: `${to.toISOString().slice(0, 10)}T23:59`,
          },
          status: { $in: ['scheduled', 'delayed'] },
          [`seats_${cabin}`]: { $gt: 0 },
          departure_utc: { $gt: now() },
        },
      },
      {
        $group: {
          _id: { $substrCP: ['$departure_time', 0, 10] },
          price: { $min: `$price_${cabin}` },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return rows.map((row) => ({ date: row._id, price: row.price }));
}

export interface PopularDestination {
  destination_id: number;
  origin_id: number;
  city: string;
  country: string;
  iata: string;
  price: number;
}

/** Popular destinations shown on the home page, with their entry price. */
export async function popularDestinations(
  originIata = 'CDG',
  limit = 8,
): Promise<PopularDestination[]> {
  const airports = await airportsCol();
  const origin = await airports.findOne({ iata: originIata.toUpperCase() });
  if (!origin) return [];

  const flights = await flightsCol();
  return flights
    .aggregate<PopularDestination>([
      {
        $match: {
          origin_id: origin._id,
          status: 'scheduled',
          seats_economy: { $gt: 0 },
          departure_utc: { $gt: now() },
        },
      },
      { $group: { _id: '$destination_id', price: { $min: '$price_economy' } } },
      { $sort: { price: 1 } },
      { $limit: limit },
      { $lookup: { from: 'airports', localField: '_id', foreignField: '_id', as: 'd' } },
      { $unwind: '$d' },
      { $lookup: { from: 'countries', localField: 'd.country_id', foreignField: '_id', as: 'dc' } },
      { $unwind: '$dc' },
      {
        $project: {
          _id: 0,
          destination_id: '$_id',
          origin_id: { $literal: origin._id },
          city: '$d.city',
          country: '$dc.name',
          iata: '$d.iata',
          price: 1,
        },
      },
    ])
    .toArray();
}

/**
 * The two figures the home page shows. Kept apart from `dashboardStats`, which
 * aggregates the whole bookings collection for numbers the page never reads.
 */
export async function flightCounts(): Promise<{ total: number; upcoming: number }> {
  const flights = await flightsCol();
  const [total, upcoming] = await Promise.all([
    flights.estimatedDocumentCount(),
    flights.countDocuments({ departure_utc: { $gt: now() }, status: 'scheduled' }),
  ]);
  return { total, upcoming };
}

export interface FlightFilter {
  search?: string;
  originId?: number;
  destinationId?: number;
  airlineId?: number;
  status?: FlightStatus;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

/** Paginated flight list for the administration area. */
export async function listFlights(
  filter: FlightFilter,
): Promise<{ rows: FlightDetail[]; total: number }> {
  const query: Document = {};

  if (filter.search) {
    const like = literal(filter.search);
    // The old query searched the joined airports too. Resolving the matching
    // airports first keeps the flight scan on indexed fields.
    const airports = await airportsCol();
    const matched = await airports
      .find({ $or: [{ iata: like }, { city: like }] }, { projection: { _id: 1 } })
      .toArray();
    const airportIds = matched.map((airport) => airport._id);
    query.$or = [
      { flight_number: like },
      { origin_id: { $in: airportIds } },
      { destination_id: { $in: airportIds } },
    ];
  }
  if (filter.originId) query.origin_id = filter.originId;
  if (filter.destinationId) query.destination_id = filter.destinationId;
  if (filter.airlineId) query.airline_id = filter.airlineId;
  if (filter.status) query.status = filter.status;
  if (filter.from || filter.to) {
    query.departure_time = {
      ...(filter.from ? { $gte: `${filter.from}T00:00` } : {}),
      ...(filter.to ? { $lte: `${filter.to}T23:59` } : {}),
    };
  }

  const perPage = filter.perPage ?? 25;
  const page = Math.max(1, filter.page ?? 1);

  const flights = await flightsCol();
  const [total, rows] = await Promise.all([
    flights.countDocuments(query),
    detailed([
      { $match: query },
      { $sort: { departure_time: 1 } },
      { $skip: (page - 1) * perPage },
      { $limit: perPage },
    ]),
  ]);

  return { rows, total };
}

export interface FlightInput {
  flight_number: string;
  airline_id: number;
  aircraft_id: number;
  origin_id: number;
  destination_id: number;
  departure_time: string;
  arrival_time: string;
  departure_utc: string;
  duration_minutes: number;
  distance_km: number;
  price_economy: number;
  price_business: number;
  price_first: number;
  seats_economy: number;
  seats_business: number;
  seats_first: number;
  baggage_kg: number;
  status: FlightStatus;
}

export async function createFlight(input: FlightInput): Promise<number> {
  const flights = await flightsCol();
  const id = await nextId('flights');
  await flights.insertOne({ _id: id, ...input, created_at: now() });
  return id;
}

export async function updateFlight(id: number, input: FlightInput): Promise<void> {
  const flights = await flightsCol();
  await flights.updateOne({ _id: id }, { $set: input });
}

export async function setFlightStatus(id: number, status: FlightStatus): Promise<void> {
  const flights = await flightsCol();
  await flights.updateOne({ _id: id }, { $set: { status } });
}

/** Number of active bookings that reference this flight. */
export async function flightBookingCount(id: number): Promise<number> {
  const bookings = await bookingsCol();
  return bookings.countDocuments({
    $or: [{ outbound_flight_id: id }, { return_flight_id: id }],
    status: { $ne: 'cancelled' },
  });
}

export async function deleteFlight(id: number): Promise<void> {
  const flights = await flightsCol();
  await flights.deleteOne({ _id: id });
}

export interface CountryFare {
  airport_id: number;
  iata: string;
  city: string;
  airport_name: string;
  price: number;
  departure_time: string;
}

/** Cheapest upcoming flight from `originIata` to each airport of a country. */
export async function cheapestToCountry(
  countryId: number,
  originIata = 'CDG',
): Promise<CountryFare[]> {
  const airports = await airportsCol();
  const [origin, destinations] = await Promise.all([
    airports.findOne({ iata: originIata.toUpperCase() }),
    airports.find({ country_id: countryId }).toArray(),
  ]);
  if (!origin || destinations.length === 0) return [];

  const byId = new Map(destinations.map((airport) => [airport._id, airport]));
  const flights = await flightsCol();
  const rows = await flights
    .aggregate<{ _id: number; price: number; departure_time: string }>([
      {
        $match: {
          origin_id: origin._id,
          destination_id: { $in: [...byId.keys()] },
          status: 'scheduled',
          seats_economy: { $gt: 0 },
          departure_utc: { $gt: now() },
        },
      },
      {
        $group: {
          _id: '$destination_id',
          price: { $min: '$price_economy' },
          departure_time: { $min: '$departure_time' },
        },
      },
      { $sort: { price: 1 } },
    ])
    .toArray();

  return rows.map((row) => {
    const airport = byId.get(row._id)!;
    return {
      airport_id: row._id,
      iata: airport.iata,
      city: airport.city,
      airport_name: airport.name,
      price: row.price,
      departure_time: row.departure_time,
    };
  });
}

/** Airlines operating at least one flight to a country, for its destination page. */
export async function airlinesServingCountry(
  countryId: number,
): Promise<{ name: string; iata: string; flights: number }[]> {
  const airports = await airportsCol();
  const destinations = await airports
    .find({ country_id: countryId }, { projection: { _id: 1 } })
    .toArray();
  if (destinations.length === 0) return [];

  const flights = await flightsCol();
  return flights
    .aggregate<{ name: string; iata: string; flights: number }>([
      {
        $match: {
          destination_id: { $in: destinations.map((airport) => airport._id) },
          departure_utc: { $gt: now() },
        },
      },
      { $group: { _id: '$airline_id', flights: { $sum: 1 } } },
      { $sort: { flights: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'airlines', localField: '_id', foreignField: '_id', as: 'al' } },
      { $unwind: '$al' },
      { $project: { _id: 0, name: '$al.name', iata: '$al.iata', flights: 1 } },
    ])
    .toArray();
}

export type { Flight };
