import 'server-only';
import { literal, now, pipeline, type Stage } from '../db';
import { AirportModel } from '../models/reference';
import { BookingModel } from '../models/bookings';
import { FlightModel } from '../models/flights';
import type { CabinClass, Flight, FlightDetail, FlightStatus } from '../types';

const FLIGHT_DETAIL: Stage[] = [
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
  { $set: { id: '$_id' } },
  { $unset: '_id' },
];

async function detailed(stages: Stage[]): Promise<FlightDetail[]> {
  return FlightModel.aggregate<FlightDetail>(pipeline([...stages, ...FLIGHT_DETAIL]));
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

export async function searchFlights(criteria: SearchCriteria): Promise<FlightDetail[]> {
  const { cabin, seats, sort = 'price' } = criteria;
  const seatField = `seats_${cabin}`;
  const priceField = `price_${cabin}`;

  const filter: Stage = {
    origin_id: criteria.originId,
    destination_id: criteria.destinationId,
    departure_time: { $gte: `${criteria.date}T00:00`, $lte: `${criteria.date}T23:59` },
    status: { $in: ['scheduled', 'delayed'] },
    [seatField]: { $gte: seats },
    departure_utc: { $gt: now() },
  };

  if (criteria.airlineId) filter.airline_id = criteria.airlineId;
  if (criteria.maxPrice !== undefined) filter[priceField] = { $lte: criteria.maxPrice };

  const order: Record<string, 1> =
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

  const rows = await FlightModel.aggregate<{ _id: string; price: number }>(
    pipeline([
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
    ]),
  );

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

export async function popularDestinations(
  originIata = 'CDG',
  limit = 8,
): Promise<PopularDestination[]> {
  const origin = await AirportModel.findOne({ iata: originIata.toUpperCase() }).lean<{
    _id: number;
  } | null>();
  if (!origin) return [];

  return FlightModel.aggregate<PopularDestination>(
    pipeline([
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
    ]),
  );
}

export async function flightCounts(): Promise<{ total: number; upcoming: number }> {
  const [total, upcoming] = await Promise.all([
    FlightModel.estimatedDocumentCount(),
    FlightModel.countDocuments({ departure_utc: { $gt: now() }, status: 'scheduled' }),
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

export async function listFlights(
  filter: FlightFilter,
): Promise<{ rows: FlightDetail[]; total: number }> {
  const query: Stage = {};

  if (filter.search) {
    const like = literal(filter.search);
    const matched = await AirportModel.find(
      { $or: [{ iata: like }, { city: like }] },
      { _id: 1 },
    ).lean<{ _id: number }[]>();
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

  const [total, rows] = await Promise.all([
    FlightModel.countDocuments(query),
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
  const created = await FlightModel.create({ ...input, created_at: now() });
  return created._id;
}

export async function updateFlight(id: number, input: FlightInput): Promise<void> {
  await FlightModel.updateOne({ _id: id }, { $set: input });
}

export async function setFlightStatus(id: number, status: FlightStatus): Promise<void> {
  await FlightModel.updateOne({ _id: id }, { $set: { status } });
}

export async function flightBookingCount(id: number): Promise<number> {
  return BookingModel.countDocuments({
    $or: [{ outbound_flight_id: id }, { return_flight_id: id }],
    status: { $ne: 'cancelled' },
  });
}

export async function deleteFlight(id: number): Promise<void> {
  await FlightModel.deleteOne({ _id: id });
}

export interface CountryFare {
  airport_id: number;
  iata: string;
  city: string;
  airport_name: string;
  price: number;
  departure_time: string;
}

export async function cheapestToCountry(
  countryId: number,
  originIata = 'CDG',
): Promise<CountryFare[]> {
  const [origin, destinations] = await Promise.all([
    AirportModel.findOne({ iata: originIata.toUpperCase() }).lean<{ _id: number } | null>(),
    AirportModel.find({ country_id: countryId }).lean<
      { _id: number; iata: string; city: string; name: string }[]
    >(),
  ]);
  if (!origin || destinations.length === 0) return [];

  const byId = new Map(destinations.map((airport) => [airport._id, airport]));
  const rows = await FlightModel.aggregate<{ _id: number; price: number; departure_time: string }>(
    pipeline([
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
    ]),
  );

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

export async function airlinesServingCountry(
  countryId: number,
): Promise<{ name: string; iata: string; flights: number }[]> {
  const destinations = await AirportModel.find({ country_id: countryId }, { _id: 1 }).lean<
    { _id: number }[]
  >();
  if (destinations.length === 0) return [];

  return FlightModel.aggregate<{ name: string; iata: string; flights: number }>(
    pipeline([
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
    ]),
  );
}

export type { Flight };
