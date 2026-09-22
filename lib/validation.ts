import * as z from 'zod';

/** Shape returned by every Server Action so forms can render field errors. */
export interface ActionState {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
}

const name = z
  .string()
  .trim()
  .min(2, 'Au moins 2 caractères.')
  .max(60, 'Au plus 60 caractères.');

const password = z
  .string()
  .min(8, 'Au moins 8 caractères.')
  .regex(/[a-zA-Z]/, 'Doit contenir une lettre.')
  .regex(/[0-9]/, 'Doit contenir un chiffre.');

const phone = z
  .string()
  .trim()
  .min(6, 'Numéro trop court.')
  .max(25, 'Numéro trop long.')
  .regex(/^[+0-9 ().-]+$/, 'Numéro invalide.');

export const RegisterSchema = z
  .object({
    first_name: name,
    last_name: name,
    email: z.email('Adresse e-mail invalide.').trim().toLowerCase(),
    phone: phone.optional().or(z.literal('')),
    password,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ['confirm'],
    message: 'Les mots de passe ne correspondent pas.',
  });

export const LoginSchema = z.object({
  email: z.email('Adresse e-mail invalide.').trim().toLowerCase(),
  password: z.string().min(1, 'Mot de passe requis.'),
});

export const ProfileSchema = z.object({
  first_name: name,
  last_name: name,
  email: z.email('Adresse e-mail invalide.').trim().toLowerCase(),
  phone: phone.optional().or(z.literal('')),
});

export const PasswordChangeSchema = z
  .object({
    current: z.string().min(1, 'Mot de passe actuel requis.'),
    password,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ['confirm'],
    message: 'Les mots de passe ne correspondent pas.',
  });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (AAAA-MM-JJ).');

export const PassengerSchema = z.object({
  first_name: name,
  last_name: name,
  date_of_birth: isoDate,
  gender: z.enum(['M', 'F', 'X']),
  nationality_id: z.coerce.number().int().positive('Nationalité requise.'),
  passport_number: z
    .string()
    .trim()
    .min(5, 'Numéro de passeport trop court.')
    .max(20, 'Numéro de passeport trop long.'),
  passport_expiry: isoDate,
  passenger_type: z.enum(['adult', 'child', 'infant']),
});

export const BookingSchema = z.object({
  outbound_flight_id: z.coerce.number().int().positive(),
  return_flight_id: z.coerce.number().int().positive().nullable(),
  cabin: z.enum(['economy', 'business', 'first']),
  contact_email: z.email('Adresse e-mail de contact invalide.').trim().toLowerCase(),
  contact_phone: phone,
  payment_method: z.enum(['card', 'paypal', 'bank_transfer']),
  card_number: z.string().optional(),
  card_holder: z.string().optional(),
  card_expiry: z.string().optional(),
  card_cvc: z.string().optional(),
  accept_terms: z.literal('on', { error: 'Vous devez accepter les conditions de vente.' }),
});

export const CountrySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Code ISO à 2 lettres.'),
  name: name,
  continent: z.string().trim().min(2, 'Continent requis.'),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Code devise à 3 lettres.'),
  phone_code: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, 'Indicatif au format +33.'),
  visa_note: z.string().trim().max(300).optional().or(z.literal('')),
});

export const AirportSchema = z.object({
  iata: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Code IATA à 3 lettres.'),
  icao: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}$/, 'Code OACI à 4 lettres.')
    .optional()
    .or(z.literal('')),
  name: z.string().trim().min(3, 'Nom requis.'),
  city: z.string().trim().min(2, 'Ville requise.'),
  country_id: z.coerce.number().int().positive('Pays requis.'),
  timezone: z.string().trim().min(3, 'Fuseau horaire requis (ex. Europe/Paris).'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export const AirlineSchema = z.object({
  iata: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2}$/, 'Code IATA à 2 caractères.'),
  name: z.string().trim().min(2, 'Nom requis.'),
  country_id: z.coerce.number().int().positive('Pays requis.'),
  alliance: z.string().trim().max(40).optional().or(z.literal('')),
  active: z.coerce.boolean(),
});

export const AircraftSchema = z.object({
  code: z.string().trim().toUpperCase().min(2, 'Code requis.').max(8),
  model: z.string().trim().min(2, 'Modèle requis.'),
  manufacturer: z.string().trim().min(2, 'Constructeur requis.'),
  capacity_economy: z.coerce.number().int().min(0).max(900),
  capacity_business: z.coerce.number().int().min(0).max(300),
  capacity_first: z.coerce.number().int().min(0).max(100),
  range_km: z.coerce.number().int().min(100).max(20000),
  cruise_speed_kmh: z.coerce.number().int().min(300).max(1200),
});

const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Date et heure invalides.');

export const FlightSchema = z.object({
  flight_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2}\d{1,4}$/, 'Numéro de vol invalide (ex. AF1234).'),
  airline_id: z.coerce.number().int().positive('Compagnie requise.'),
  aircraft_id: z.coerce.number().int().positive('Appareil requis.'),
  origin_id: z.coerce.number().int().positive('Aéroport de départ requis.'),
  destination_id: z.coerce.number().int().positive("Aéroport d'arrivée requis."),
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
  email: z.email('Adresse e-mail invalide.').trim().toLowerCase(),
  phone: phone.optional().or(z.literal('')),
  role: z.enum(['user', 'admin']),
  status: z.enum(['active', 'suspended']),
});

export const AdminUserCreateSchema = AdminUserSchema.extend({ password });

/** Collapse a Zod error into the `{ field: [messages] }` shape forms expect. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
