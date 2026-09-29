import * as z from 'zod';

export interface ActionState {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
}

const name = z
  .string()
  .trim()
  .min(2, 'At least 2 characters.')
  .max(60, 'At most 60 characters.');

const email = z.email('Invalid email address.').trim().toLowerCase().max(254);

const WEAK_PASSWORDS = new Set([
  'password', 'motdepasse', '123456789', '123456789a', 'azertyuiop', 'qwertyuiop',
  'password1', 'motdepasse1', 'admin1234', 'administrateur', 'iloveyou1',
  'skyroute', 'skyroute1', 'admin@2026', 'client@2026', 'azerty123', 'qwerty123',
  'bonjour123', 'soleil123', 'passw0rd', 'p@ssw0rd', 'welcome123', 'changeme123',
]);

const password = z
  .string()
  .min(12, 'At least 12 characters.')
  .max(128, 'At most 128 characters.')
  .regex(/[a-z]/, 'Must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Must contain an uppercase letter.')
  .regex(/[0-9]/, 'Must contain a digit.')
  .refine((value) => value.trim() === value, 'Cannot start or end with a space.')
  .refine(
    (value) => !WEAK_PASSWORDS.has(value.toLowerCase()),
    'This password is too common — choose another one.',
  )
  .refine((value) => new Set(value).size >= 5, 'This password is too repetitive.');

function unrelatedToEmail(data: { email: string; password: string }): boolean {
  const local = data.email.split('@')[0]?.toLowerCase() ?? '';
  return local.length < 3 || !data.password.toLowerCase().includes(local);
}

export const IdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const SearchSchema = z.string().trim().max(64);

const phone = z
  .string()
  .trim()
  .min(6, 'Number too short.')
  .max(25, 'Number too long.')
  .regex(/^[+0-9 ().-]+$/, 'Invalid number.');

export const RegisterSchema = z
  .object({
    first_name: name,
    last_name: name,
    email,
    phone: phone.optional().or(z.literal('')),
    password,
    confirm: z.string().max(128),
  })
  .refine((data) => data.password === data.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match.',
  })
  .refine(unrelatedToEmail, {
    path: ['password'],
    message: 'The password must not repeat your email address.',
  });

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, 'Password required.').max(128),
});

export const ProfileSchema = z.object({
  first_name: name,
  last_name: name,
  email,
  phone: phone.optional().or(z.literal('')),
});

export const PasswordChangeSchema = z
  .object({
    current: z.string().min(1, 'Current password required.').max(128),
    password,
    confirm: z.string().max(128),
  })
  .refine((data) => data.password === data.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match.',
  })
  .refine((data) => data.password !== data.current, {
    path: ['password'],
    message: 'The new password must be different from the old one.',
  });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (YYYY-MM-DD).');

export const PassengerSchema = z.object({
  first_name: name,
  last_name: name,
  date_of_birth: isoDate,
  gender: z.enum(['M', 'F', 'X']),
  nationality_id: z.coerce.number().int().positive('Nationality required.'),
  passport_number: z
    .string()
    .trim()
    .toUpperCase()
    .min(5, 'Passport number too short.')
    .max(20, 'Passport number too long.')
    .regex(/^[A-Z0-9]+$/, 'Invalid passport number (letters and digits only).'),
  passport_expiry: isoDate,
  passenger_type: z.enum(['adult', 'child', 'infant']),
});

export const BookingSchema = z.object({
  outbound_flight_id: IdSchema,
  return_flight_id: IdSchema.nullable(),
  cabin: z.enum(['economy', 'business', 'first']),
  contact_email: email,
  contact_phone: phone,
  payment_method: z.enum(['card', 'paypal', 'bank_transfer']),
  card_number: z.string().trim().max(25).optional(),
  card_holder: z.string().trim().max(60).optional(),
  card_expiry: z.string().trim().max(7).optional(),
  card_cvc: z.string().trim().max(4).optional(),
  accept_terms: z.literal('on', { error: 'You must accept the terms of sale.' }),
});

export const CountrySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, '2-letter ISO code.'),
  name: name,
  continent: z.string().trim().min(2, 'Continent required.').max(40),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, '3-letter currency code.'),
  phone_code: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, 'Dialling code in +33 format.'),
  visa_note: z.string().trim().max(300).optional().or(z.literal('')),
});

export const AirportSchema = z.object({
  iata: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, '3-letter IATA code.'),
  icao: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}$/, '4-letter ICAO code.')
    .optional()
    .or(z.literal('')),
  name: z.string().trim().min(3, 'Name required.').max(80),
  city: z.string().trim().min(2, 'City required.').max(60),
  country_id: IdSchema,
  timezone: z
    .string()
    .trim()
    .min(3, 'Timezone required (e.g. Europe/Paris).')
    .max(64)
    .regex(/^[A-Za-z0-9+_-]+(?:\/[A-Za-z0-9+_-]+){0,2}$/, 'Invalid timezone.'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export const AirlineSchema = z.object({
  iata: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2}$/, '2-character IATA code.'),
  name: z.string().trim().min(2, 'Name required.').max(80),
  country_id: z.coerce.number().int().positive('Country required.'),
  alliance: z.string().trim().max(40).optional().or(z.literal('')),
  active: z.coerce.boolean(),
});

export const AircraftSchema = z.object({
  code: z.string().trim().toUpperCase().min(2, 'Code required.').max(8),
  model: z.string().trim().min(2, 'Model required.').max(60),
  manufacturer: z.string().trim().min(2, 'Manufacturer required.').max(60),
  capacity_economy: z.coerce.number().int().min(0).max(900),
  capacity_business: z.coerce.number().int().min(0).max(300),
  capacity_first: z.coerce.number().int().min(0).max(100),
  range_km: z.coerce.number().int().min(100).max(20000),
  cruise_speed_kmh: z.coerce.number().int().min(300).max(1200),
});

const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid date and time.');

export const FlightSchema = z.object({
  flight_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2}\d{1,4}$/, 'Invalid flight number (e.g. AF1234).'),
  airline_id: z.coerce.number().int().positive('Airline required.'),
  aircraft_id: z.coerce.number().int().positive('Aircraft required.'),
  origin_id: z.coerce.number().int().positive('Origin airport required.'),
  destination_id: z.coerce.number().int().positive('Destination airport required.'),
  departure_time: localDateTime,
  price_economy: z.coerce.number().min(0).max(100000),
  price_business: z.coerce.number().min(0).max(200000),
  price_first: z.coerce.number().min(0).max(400000),
  seats_economy: z.coerce.number().int().min(0).max(900),
  seats_business: z.coerce.number().int().min(0).max(300),
  seats_first: z.coerce.number().int().min(0).max(100),
  baggage_kg: z.coerce.number().int().min(0).max(80),
  status: z.enum(['scheduled', 'delayed', 'cancelled', 'departed', 'landed']),
});

export const AdminUserSchema = z.object({
  first_name: name,
  last_name: name,
  email,
  phone: phone.optional().or(z.literal('')),
  role: z.enum(['user', 'admin']),
  status: z.enum(['active', 'suspended']),
});

export const AdminUserCreateSchema = AdminUserSchema.extend({ password }).refine(
  unrelatedToEmail,
  { path: ['password'], message: 'The password must not repeat the email address.' },
);

export const FlightStatusSchema = z.enum([
  'scheduled',
  'delayed',
  'cancelled',
  'departed',
  'landed',
]);

export const BookingStatusSchema = z.enum(['pending', 'confirmed', 'completed']);

export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
