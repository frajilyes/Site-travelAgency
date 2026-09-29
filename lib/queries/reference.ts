import 'server-only';
import { AS_ENTITY, fromDoc, fromDocs, literal, pipeline, startsWith, type Doc, type Stage } from '../db';
import { AircraftModel, AirlineModel, AirportModel, CountryModel } from '../models';
import { FlightModel } from '../models/flights';
import { PassengerModel } from '../models/bookings';
import type { Aircraft, Airline, Airport, AirportWithCountry, Country } from '../types';


export async function listCountries(): Promise<Country[]> {
  return fromDocs<Country>(await CountryModel.find().sort({ name: 1 }).lean<Doc<Country>[]>());
}

export async function getCountry(id: number): Promise<Country | undefined> {
  return fromDoc<Country>(await CountryModel.findOne({ _id: id }).lean<Doc<Country> | null>());
}

export async function getCountryByCode(code: string): Promise<Country | undefined> {
  return fromDoc<Country>(
    await CountryModel.findOne({ code: code.toUpperCase() }).lean<Doc<Country> | null>(),
  );
}

export interface CountryInput {
  code: string;
  name: string;
  continent: string;
  currency: string;
  phone_code: string;
  visa_note: string | null;
}

export async function createCountry(input: CountryInput): Promise<number> {
  const created = await CountryModel.create(input);
  return created._id;
}

export async function updateCountry(id: number, input: CountryInput): Promise<void> {
  await CountryModel.updateOne({ _id: id }, { $set: input });
}

export async function deleteCountry(id: number): Promise<void> {
  await CountryModel.deleteOne({ _id: id });
}

export async function countryUsage(id: number): Promise<number> {
  const [airports, airlines, passengers] = await Promise.all([
    AirportModel.countDocuments({ country_id: id }),
    AirlineModel.countDocuments({ country_id: id }),
    PassengerModel.countDocuments({ nationality_id: id }),
  ]);
  return airports + airlines + passengers;
}

export interface DestinationCountry {
  id: number;
  name: string;
  continent: string;
  code: string;
  airports: number;
  cities: string;
}

export async function destinationCountries(): Promise<DestinationCountry[]> {
  const rows = await CountryModel.aggregate<{
    _id: number;
    name: string;
    continent: string;
    code: string;
    airports: number;
    cities: string[];
  }>(
    pipeline([
      {
        $lookup: {
          from: 'airports',
          localField: '_id',
          foreignField: 'country_id',
          as: 'served',
        },
      },
      { $match: { 'served.0': { $exists: true } } },
      {
        $project: {
          name: 1,
          continent: 1,
          code: 1,
          airports: { $size: '$served' },
          cities: '$served.city',
        },
      },
      { $sort: { continent: 1, name: 1 } },
    ]),
  );

  return rows.map(({ _id, cities, ...rest }) => ({
    id: _id,
    ...rest,
    cities: [...new Set(cities)].join(','),
  }));
}


const AIRPORT_WITH_COUNTRY: Stage[] = [
  { $lookup: { from: 'countries', localField: 'country_id', foreignField: '_id', as: 'country' } },
  { $unwind: '$country' },
  { $set: { country_name: '$country.name', country_code: '$country.code' } },
  { $unset: 'country' },
];

async function airportsWithCountry(
  stages: Stage[] = [],
  tail: Stage[] = [],
): Promise<AirportWithCountry[]> {
  return AirportModel.aggregate<AirportWithCountry>(
    pipeline([...stages, ...AIRPORT_WITH_COUNTRY, ...tail, ...AS_ENTITY]),
  );
}

export async function listAirports(): Promise<AirportWithCountry[]> {
  return airportsWithCountry([], [{ $sort: { country_name: 1, city: 1, iata: 1 } }]);
}

export async function getAirport(id: number): Promise<AirportWithCountry | undefined> {
  const [airport] = await airportsWithCountry([{ $match: { _id: id } }]);
  return airport;
}

export async function getAirportByIata(iata: string): Promise<AirportWithCountry | undefined> {
  const [airport] = await airportsWithCountry([{ $match: { iata: iata.toUpperCase() } }]);
  return airport;
}

export async function searchAirports(term: string, limit = 8): Promise<AirportWithCountry[]> {
  const like = literal(term);
  return airportsWithCountry(
    [],
    [
      {
        $match: {
          $or: [{ iata: like }, { city: like }, { name: like }, { country_name: like }],
        },
      },
      {
        $set: {
          rank: {
            $switch: {
              branches: [
                { case: { $eq: ['$iata', term.toUpperCase()] }, then: 0 },
                { case: { $regexMatch: { input: '$city', regex: startsWith(term) } }, then: 1 },
              ],
              default: 2,
            },
          },
        },
      },
      { $sort: { rank: 1, city: 1 } },
      { $limit: limit },
      { $unset: 'rank' },
    ],
  );
}

export interface AirportInput {
  iata: string;
  icao: string | null;
  name: string;
  city: string;
  country_id: number;
  timezone: string;
  latitude: number;
  longitude: number;
}

export async function createAirport(input: AirportInput): Promise<number> {
  const created = await AirportModel.create(input);
  return created._id;
}

export async function updateAirport(id: number, input: AirportInput): Promise<void> {
  await AirportModel.updateOne({ _id: id }, { $set: input });
}

export async function deleteAirport(id: number): Promise<void> {
  await AirportModel.deleteOne({ _id: id });
}

export async function airportUsage(id: number): Promise<number> {
  return FlightModel.countDocuments({ $or: [{ origin_id: id }, { destination_id: id }] });
}


export interface AirlineWithCountry extends Airline {
  country_name: string;
  flights: number;
}

export async function listAirlines(): Promise<AirlineWithCountry[]> {
  const [rows, operated] = await Promise.all([
    AirlineModel.aggregate<Omit<AirlineWithCountry, 'flights'>>(
      pipeline([
        { $lookup: { from: 'countries', localField: 'country_id', foreignField: '_id', as: 'country' } },
        { $unwind: '$country' },
        { $set: { country_name: '$country.name' } },
        { $unset: 'country' },
        { $sort: { name: 1 } },
        ...AS_ENTITY,
      ]),
    ),
    FlightModel.aggregate<{ _id: number; n: number }>(
      pipeline([{ $group: { _id: '$airline_id', n: { $sum: 1 } } }]),
    ),
  ]);

  const counts = new Map(operated.map((row) => [row._id, row.n]));
  return rows.map((airline) => ({ ...airline, flights: counts.get(airline.id) ?? 0 }));
}

export async function listActiveAirlines(): Promise<Airline[]> {
  return fromDocs<Airline>(
    await AirlineModel.find({ active: 1 }).sort({ name: 1 }).lean<Doc<Airline>[]>(),
  );
}

export async function getAirline(id: number): Promise<Airline | undefined> {
  return fromDoc<Airline>(await AirlineModel.findOne({ _id: id }).lean<Doc<Airline> | null>());
}

export interface AirlineInput {
  iata: string;
  name: string;
  country_id: number;
  alliance: string | null;
  active: number;
}

export async function createAirline(input: AirlineInput): Promise<number> {
  const created = await AirlineModel.create(input);
  return created._id;
}

export async function updateAirline(id: number, input: AirlineInput): Promise<void> {
  await AirlineModel.updateOne({ _id: id }, { $set: input });
}

export async function deleteAirline(id: number): Promise<void> {
  await AirlineModel.deleteOne({ _id: id });
}

export async function airlineUsage(id: number): Promise<number> {
  return FlightModel.countDocuments({ airline_id: id });
}


export async function listAircraft(): Promise<Aircraft[]> {
  return fromDocs<Aircraft>(
    await AircraftModel.find().sort({ manufacturer: 1, model: 1 }).lean<Doc<Aircraft>[]>(),
  );
}

export async function getAircraft(id: number): Promise<Aircraft | undefined> {
  return fromDoc<Aircraft>(await AircraftModel.findOne({ _id: id }).lean<Doc<Aircraft> | null>());
}

export interface AircraftInput {
  code: string;
  model: string;
  manufacturer: string;
  capacity_economy: number;
  capacity_business: number;
  capacity_first: number;
  range_km: number;
  cruise_speed_kmh: number;
}

export async function createAircraft(input: AircraftInput): Promise<number> {
  const created = await AircraftModel.create(input);
  return created._id;
}

export async function updateAircraft(id: number, input: AircraftInput): Promise<void> {
  await AircraftModel.updateOne({ _id: id }, { $set: input });
}

export async function deleteAircraft(id: number): Promise<void> {
  await AircraftModel.deleteOne({ _id: id });
}

export async function aircraftUsage(id: number): Promise<number> {
  return FlightModel.countDocuments({ aircraft_id: id });
}

export type { Airport, Country, Aircraft, Airline };
