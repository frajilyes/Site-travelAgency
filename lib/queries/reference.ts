import 'server-only';
import type { Document } from 'mongodb';
import {
  AS_ENTITY,
  aircraftCol,
  airlinesCol,
  airportsCol,
  countriesCol,
  flightsCol,
  fromDoc,
  fromDocs,
  literal,
  nextId,
  passengersCol,
  startsWith,
} from '../mongodb';
import type { Aircraft, Airline, Airport, AirportWithCountry, Country } from '../types';

/* ---------------------------------------------------------------- countries */

export async function listCountries(): Promise<Country[]> {
  const countries = await countriesCol();
  return fromDocs<Country>(await countries.find().sort({ name: 1 }).toArray());
}

export async function getCountry(id: number): Promise<Country | undefined> {
  const countries = await countriesCol();
  return fromDoc<Country>(await countries.findOne({ _id: id }));
}

export async function getCountryByCode(code: string): Promise<Country | undefined> {
  const countries = await countriesCol();
  return fromDoc<Country>(await countries.findOne({ code: code.toUpperCase() }));
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
  const countries = await countriesCol();
  const id = await nextId('countries');
  await countries.insertOne({ _id: id, ...input });
  return id;
}

export async function updateCountry(id: number, input: CountryInput): Promise<void> {
  const countries = await countriesCol();
  await countries.updateOne({ _id: id }, { $set: input });
}

export async function deleteCountry(id: number): Promise<void> {
  const countries = await countriesCol();
  await countries.deleteOne({ _id: id });
}

/** Documents that would break if the country disappeared — the old RESTRICT. */
export async function countryUsage(id: number): Promise<number> {
  const [airports, airlines, passengers] = await Promise.all([
    (await airportsCol()).countDocuments({ country_id: id }),
    (await airlinesCol()).countDocuments({ country_id: id }),
    (await passengersCol()).countDocuments({ nationality_id: id }),
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

/** Countries that have at least one airport, grouped by continent. */
export async function destinationCountries(): Promise<DestinationCountry[]> {
  const countries = await countriesCol();
  const rows = await countries
    .aggregate<{
      _id: number;
      name: string;
      continent: string;
      code: string;
      airports: number;
      cities: string[];
    }>([
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
    ])
    .toArray();

  return rows.map(({ _id, cities, ...rest }) => ({
    id: _id,
    ...rest,
    // The old query used GROUP_CONCAT(DISTINCT …); callers still split on commas.
    cities: [...new Set(cities)].join(','),
  }));
}

/* ----------------------------------------------------------------- airports */

/** Joins each airport to its country, replacing the old `JOIN countries`. */
const AIRPORT_WITH_COUNTRY: Document[] = [
  { $lookup: { from: 'countries', localField: 'country_id', foreignField: '_id', as: 'country' } },
  { $unwind: '$country' },
  { $set: { country_name: '$country.name', country_code: '$country.code' } },
  { $unset: 'country' },
];

async function airportsWithCountry(
  stages: Document[] = [],
  tail: Document[] = [],
): Promise<AirportWithCountry[]> {
  const airports = await airportsCol();
  return airports
    .aggregate<AirportWithCountry>([...stages, ...AIRPORT_WITH_COUNTRY, ...tail, ...AS_ENTITY])
    .toArray();
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

/** Airport lookup used by the search form's autocomplete. */
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
        // Exact IATA code first, then a city that starts with the term.
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
  const airports = await airportsCol();
  const id = await nextId('airports');
  await airports.insertOne({ _id: id, ...input });
  return id;
}

export async function updateAirport(id: number, input: AirportInput): Promise<void> {
  const airports = await airportsCol();
  await airports.updateOne({ _id: id }, { $set: input });
}

export async function deleteAirport(id: number): Promise<void> {
  const airports = await airportsCol();
  await airports.deleteOne({ _id: id });
}

export async function airportUsage(id: number): Promise<number> {
  const flights = await flightsCol();
  return flights.countDocuments({ $or: [{ origin_id: id }, { destination_id: id }] });
}

/* ----------------------------------------------------------------- airlines */

export interface AirlineWithCountry extends Airline {
  country_name: string;
  flights: number;
}

export async function listAirlines(): Promise<AirlineWithCountry[]> {
  const [airlines, flights] = await Promise.all([airlinesCol(), flightsCol()]);

  // One grouped pass over the flights index beats a per-airline `$lookup`
  // count, which re-scans the collection once for every carrier.
  const [rows, operated] = await Promise.all([
    airlines
      .aggregate<Omit<AirlineWithCountry, 'flights'>>([
        {
          $lookup: { from: 'countries', localField: 'country_id', foreignField: '_id', as: 'country' },
        },
        { $unwind: '$country' },
        { $set: { country_name: '$country.name' } },
        { $unset: 'country' },
        { $sort: { name: 1 } },
        ...AS_ENTITY,
      ])
      .toArray(),
    flights.aggregate<{ _id: number; n: number }>([{ $group: { _id: '$airline_id', n: { $sum: 1 } } }]).toArray(),
  ]);

  const counts = new Map(operated.map((row) => [row._id, row.n]));
  return rows.map((airline) => ({ ...airline, flights: counts.get(airline.id) ?? 0 }));
}

export async function listActiveAirlines(): Promise<Airline[]> {
  const airlines = await airlinesCol();
  return fromDocs<Airline>(await airlines.find({ active: 1 }).sort({ name: 1 }).toArray());
}

export async function getAirline(id: number): Promise<Airline | undefined> {
  const airlines = await airlinesCol();
  return fromDoc<Airline>(await airlines.findOne({ _id: id }));
}

export interface AirlineInput {
  iata: string;
  name: string;
  country_id: number;
  alliance: string | null;
  active: number;
}

export async function createAirline(input: AirlineInput): Promise<number> {
  const airlines = await airlinesCol();
  const id = await nextId('airlines');
  await airlines.insertOne({ _id: id, ...input });
  return id;
}

export async function updateAirline(id: number, input: AirlineInput): Promise<void> {
  const airlines = await airlinesCol();
  await airlines.updateOne({ _id: id }, { $set: input });
}

export async function deleteAirline(id: number): Promise<void> {
  const airlines = await airlinesCol();
  await airlines.deleteOne({ _id: id });
}

export async function airlineUsage(id: number): Promise<number> {
  const flights = await flightsCol();
  return flights.countDocuments({ airline_id: id });
}

/* ----------------------------------------------------------------- aircraft */

export async function listAircraft(): Promise<Aircraft[]> {
  const aircraft = await aircraftCol();
  return fromDocs<Aircraft>(await aircraft.find().sort({ manufacturer: 1, model: 1 }).toArray());
}

export async function getAircraft(id: number): Promise<Aircraft | undefined> {
  const aircraft = await aircraftCol();
  return fromDoc<Aircraft>(await aircraft.findOne({ _id: id }));
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
  const aircraft = await aircraftCol();
  const id = await nextId('aircraft');
  await aircraft.insertOne({ _id: id, ...input });
  return id;
}

export async function updateAircraft(id: number, input: AircraftInput): Promise<void> {
  const aircraft = await aircraftCol();
  await aircraft.updateOne({ _id: id }, { $set: input });
}

export async function deleteAircraft(id: number): Promise<void> {
  const aircraft = await aircraftCol();
  await aircraft.deleteOne({ _id: id });
}

export async function aircraftUsage(id: number): Promise<number> {
  const flights = await flightsCol();
  return flights.countDocuments({ aircraft_id: id });
}

export type { Airport, Country, Aircraft, Airline };
