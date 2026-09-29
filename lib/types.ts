export type Role = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type CabinClass = 'economy' | 'business' | 'first';
export type FlightStatus = 'scheduled' | 'delayed' | 'cancelled' | 'departed' | 'landed';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentMethod = 'card' | 'paypal' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type PassengerType = 'adult' | 'child' | 'infant';

export const CABIN_CLASSES: CabinClass[] = ['economy', 'business', 'first'];

export const CABIN_LABELS: Record<CabinClass, string> = {
  economy: 'Economy',
  business: 'Business',
  first: 'First',
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Awaiting payment',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const FLIGHT_STATUS_LABELS: Record<FlightStatus, string> = {
  scheduled: 'Scheduled',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
  departed: 'Departed',
  landed: 'Landed',
};

export interface Country {
  id: number;
  code: string;
  name: string;
  continent: string;
  currency: string;
  phone_code: string;
  visa_note: string | null;
}

export interface Airport {
  id: number;
  iata: string;
  icao: string | null;
  name: string;
  city: string;
  country_id: number;
  timezone: string;
  latitude: number;
  longitude: number;
}

export interface AirportWithCountry extends Airport {
  country_name: string;
  country_code: string;
}

export interface Airline {
  id: number;
  iata: string;
  name: string;
  country_id: number;
  alliance: string | null;
  active: number;
}

export interface Aircraft {
  id: number;
  code: string;
  model: string;
  manufacturer: string;
  capacity_economy: number;
  capacity_business: number;
  capacity_first: number;
  range_km: number;
  cruise_speed_kmh: number;
}

export interface Flight {
  id: number;
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
  created_at: string;
}

export interface FlightDetail extends Flight {
  airline_name: string;
  airline_iata: string;
  aircraft_model: string;
  aircraft_manufacturer: string;
  origin_iata: string;
  origin_city: string;
  origin_name: string;
  origin_country: string;
  destination_iata: string;
  destination_city: string;
  destination_name: string;
  destination_country: string;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  google_id: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  session_version: number;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  created_at: string;
}

export interface Booking {
  id: number;
  reference: string;
  user_id: number;
  outbound_flight_id: number;
  return_flight_id: number | null;
  cabin_class: CabinClass;
  passenger_count: number;
  base_price: number;
  taxes: number;
  total_price: number;
  currency: string;
  status: BookingStatus;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  cancelled_at: string | null;
}

export interface Passenger {
  id: number;
  booking_id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'M' | 'F' | 'X';
  nationality_id: number;
  passport_number: string;
  passport_expiry: string;
  passenger_type: PassengerType;
  seat_outbound: string | null;
  seat_return: string | null;
}

export interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  card_last4: string | null;
  transaction_ref: string;
  created_at: string;
}

export interface BookingDetail extends Booking {
  outbound: FlightDetail;
  returnFlight: FlightDetail | null;
  passengers: (Passenger & { nationality: string })[];
  payments: Payment[];
  customer: PublicUser;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: string | null;
  ip: string | null;
  created_at: string;
}
