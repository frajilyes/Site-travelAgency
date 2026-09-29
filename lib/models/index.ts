import 'server-only';
import { connectDB } from '../db';
import { AircraftModel, AirlineModel, AirportModel, CountryModel } from './reference';
import { AuditLogModel, UserModel } from './users';
import { FlightModel } from './flights';
import { BookingModel, PassengerModel, PaymentModel } from './bookings';
import { RateLimitModel } from './security';

export { AircraftModel, AirlineModel, AirportModel, CountryModel } from './reference';
export { RateLimitModel } from './security';
export { AuditLogModel, UserModel } from './users';
export { FlightModel } from './flights';
export { BookingModel, PassengerModel, PaymentModel } from './bookings';

const ALL_MODELS = [
  CountryModel,
  AirportModel,
  AirlineModel,
  AircraftModel,
  UserModel,
  AuditLogModel,
  FlightModel,
  BookingModel,
  PassengerModel,
  PaymentModel,
  RateLimitModel,
];

export async function ensureIndexes(): Promise<void> {
  await connectDB();
  await Promise.all(ALL_MODELS.map((model) => model.createIndexes()));
}
