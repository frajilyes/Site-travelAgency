import 'server-only';
import mongoose, { Schema } from 'mongoose';
import { autoIncrement } from '../db';
import type { Aircraft, Airline, Airport, Country } from '../types';

type CountryDoc = Omit<Country, 'id'> & { _id: number };
type AirportDoc = Omit<Airport, 'id'> & { _id: number };
type AirlineDoc = Omit<Airline, 'id'> & { _id: number };
type AircraftDoc = Omit<Aircraft, 'id'> & { _id: number };

const OPTIONS = { versionKey: false, id: false } as const;

const countrySchema = new Schema<CountryDoc>(
  {
    _id: { type: Number },
    code: { type: String, required: true },
    name: { type: String, required: true },
    continent: { type: String, required: true },
    currency: { type: String, required: true },
    phone_code: { type: String, required: true },
    visa_note: { type: String, default: null },
  },
  OPTIONS,
);
countrySchema.index({ code: 1 }, { unique: true, name: 'uniq_countries_code' });
countrySchema.index({ name: 1 }, { name: 'idx_countries_name' });
autoIncrement(countrySchema, 'countries');

const airportSchema = new Schema<AirportDoc>(
  {
    _id: { type: Number },
    iata: { type: String, required: true },
    icao: { type: String, default: null },
    name: { type: String, required: true },
    city: { type: String, required: true },
    country_id: { type: Number, required: true },
    timezone: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  OPTIONS,
);
airportSchema.index({ iata: 1 }, { unique: true, name: 'uniq_airports_iata' });
airportSchema.index({ country_id: 1 }, { name: 'idx_airports_country' });
airportSchema.index({ city: 1 }, { name: 'idx_airports_city' });
autoIncrement(airportSchema, 'airports');

const airlineSchema = new Schema<AirlineDoc>(
  {
    _id: { type: Number },
    iata: { type: String, required: true },
    name: { type: String, required: true },
    country_id: { type: Number, required: true },
    alliance: { type: String, default: null },
    active: { type: Number, required: true, default: 1 },
  },
  OPTIONS,
);
airlineSchema.index({ iata: 1 }, { unique: true, name: 'uniq_airlines_iata' });
airlineSchema.index({ name: 1 }, { name: 'idx_airlines_name' });
autoIncrement(airlineSchema, 'airlines');

const aircraftSchema = new Schema<AircraftDoc>(
  {
    _id: { type: Number },
    code: { type: String, required: true },
    model: { type: String, required: true },
    manufacturer: { type: String, required: true },
    capacity_economy: { type: Number, required: true },
    capacity_business: { type: Number, required: true },
    capacity_first: { type: Number, required: true },
    range_km: { type: Number, required: true },
    cruise_speed_kmh: { type: Number, required: true },
  },
  OPTIONS,
);
aircraftSchema.index({ code: 1 }, { unique: true, name: 'uniq_aircraft_code' });
autoIncrement(aircraftSchema, 'aircraft');

export const CountryModel =
  (mongoose.models.Country as mongoose.Model<CountryDoc>) ??
  mongoose.model<CountryDoc>('Country', countrySchema, 'countries');

export const AirportModel =
  (mongoose.models.Airport as mongoose.Model<AirportDoc>) ??
  mongoose.model<AirportDoc>('Airport', airportSchema, 'airports');

export const AirlineModel =
  (mongoose.models.Airline as mongoose.Model<AirlineDoc>) ??
  mongoose.model<AirlineDoc>('Airline', airlineSchema, 'airlines');

export const AircraftModel =
  (mongoose.models.Aircraft as mongoose.Model<AircraftDoc>) ??
  mongoose.model<AircraftDoc>('Aircraft', aircraftSchema, 'aircraft');
