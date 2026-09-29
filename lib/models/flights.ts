import 'server-only';
import mongoose, { Schema } from 'mongoose';
import { autoIncrement } from '../db';
import type { Flight, FlightStatus } from '../types';

type FlightDoc = Omit<Flight, 'id'> & { _id: number };

const OPTIONS = { versionKey: false, id: false } as const;

const FLIGHT_STATUSES: FlightStatus[] = ['scheduled', 'delayed', 'cancelled', 'departed', 'landed'];

const flightSchema = new Schema<FlightDoc>(
  {
    _id: { type: Number },
    flight_number: { type: String, required: true },
    airline_id: { type: Number, required: true },
    aircraft_id: { type: Number, required: true },
    origin_id: { type: Number, required: true },
    destination_id: { type: Number, required: true },
    departure_time: { type: String, required: true },
    arrival_time: { type: String, required: true },
    departure_utc: { type: String, required: true },
    duration_minutes: { type: Number, required: true },
    distance_km: { type: Number, required: true },
    price_economy: { type: Number, required: true },
    price_business: { type: Number, required: true },
    price_first: { type: Number, required: true },
    seats_economy: { type: Number, required: true },
    seats_business: { type: Number, required: true },
    seats_first: { type: Number, required: true },
    baggage_kg: { type: Number, required: true, default: 23 },
    status: { type: String, required: true, enum: FLIGHT_STATUSES, default: 'scheduled' },
    created_at: { type: String, required: true },
  },
  OPTIONS,
);

flightSchema.index(
  { flight_number: 1, departure_time: 1 },
  { unique: true, name: 'uniq_flights_number_departure' },
);
flightSchema.index({ origin_id: 1, destination_id: 1, departure_time: 1 }, { name: 'idx_flights_route' });
flightSchema.index({ departure_time: 1 }, { name: 'idx_flights_departure' });
flightSchema.index({ departure_utc: 1 }, { name: 'idx_flights_departure_utc' });
flightSchema.index({ status: 1, departure_utc: 1 }, { name: 'idx_flights_status_utc' });
flightSchema.index({ origin_id: 1, departure_utc: 1 }, { name: 'idx_flights_origin_utc' });
flightSchema.index({ destination_id: 1, departure_utc: 1 }, { name: 'idx_flights_destination_utc' });
flightSchema.index({ airline_id: 1 }, { name: 'idx_flights_airline' });
flightSchema.index({ aircraft_id: 1 }, { name: 'idx_flights_aircraft' });
autoIncrement(flightSchema, 'flights');

export const FlightModel =
  (mongoose.models.Flight as mongoose.Model<FlightDoc>) ??
  mongoose.model<FlightDoc>('Flight', flightSchema, 'flights');
