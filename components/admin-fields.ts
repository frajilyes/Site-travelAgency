import type { FieldSpec } from './entity-form';
import type { Aircraft, Airline, AirportWithCountry, Country } from '@/lib/types';
import { CABIN_LABELS, FLIGHT_STATUS_LABELS, type FlightStatus } from '@/lib/types';

export function flightFields(
  airlines: Airline[],
  aircraft: Aircraft[],
  airports: AirportWithCountry[],
): FieldSpec[] {
  const airportOptions = airports.map((airport) => ({
    value: airport.id,
    label: `${airport.city} (${airport.iata}) — ${airport.country_name}`,
  }));

  return [
    {
      kind: 'text',
      name: 'flight_number',
      label: 'Flight number',
      required: true,
      placeholder: 'AF1234',
      hint: 'Airline code followed by 1 to 4 digits.',
    },
    {
      kind: 'select',
      name: 'airline_id',
      label: 'Airline',
      required: true,
      options: airlines.map((airline) => ({
        value: airline.id,
        label: `${airline.name} (${airline.iata})`,
      })),
    },
    {
      kind: 'select',
      name: 'aircraft_id',
      label: 'Aircraft',
      required: true,
      options: aircraft.map((plane) => ({
        value: plane.id,
        label: `${plane.manufacturer} ${plane.model} — ${plane.capacity_economy}/${plane.capacity_business}/${plane.capacity_first} seats`,
      })),
    },
    {
      kind: 'select',
      name: 'origin_id',
      label: 'Origin airport',
      required: true,
      options: airportOptions,
    },
    {
      kind: 'select',
      name: 'destination_id',
      label: 'Destination airport',
      required: true,
      options: airportOptions,
    },
    {
      kind: 'datetime-local',
      name: 'departure_time',
      label: 'Departure (local time)',
      required: true,
      hint: 'Duration, distance and arrival time are calculated automatically.',
    },
    {
      kind: 'number',
      name: 'price_economy',
      label: `${CABIN_LABELS.economy} fare (€)`,
      required: true,
      min: 0,
      step: 0.01,
    },
    {
      kind: 'number',
      name: 'price_business',
      label: `${CABIN_LABELS.business} fare (€)`,
      required: true,
      min: 0,
      step: 0.01,
    },
    {
      kind: 'number',
      name: 'price_first',
      label: `${CABIN_LABELS.first} fare (€)`,
      required: true,
      min: 0,
      step: 0.01,
    },
    { kind: 'number', name: 'seats_economy', label: 'Economy seats', required: true, min: 0 },
    { kind: 'number', name: 'seats_business', label: 'Business seats', required: true, min: 0 },
    { kind: 'number', name: 'seats_first', label: 'First class seats', required: true, min: 0 },
    {
      kind: 'number',
      name: 'baggage_kg',
      label: 'Baggage allowance (kg)',
      required: true,
      min: 0,
      max: 80,
    },
    {
      kind: 'select',
      name: 'status',
      label: 'Status',
      required: true,
      options: (Object.keys(FLIGHT_STATUS_LABELS) as FlightStatus[]).map((status) => ({
        value: status,
        label: FLIGHT_STATUS_LABELS[status],
      })),
    },
  ];
}

export function airportFields(countries: Country[]): FieldSpec[] {
  return [
    { kind: 'text', name: 'iata', label: 'IATA code', required: true, placeholder: 'CDG' },
    { kind: 'text', name: 'icao', label: 'ICAO code', placeholder: 'LFPG' },
    {
      kind: 'text',
      name: 'name',
      label: 'Airport name',
      required: true,
      span: 2,
      placeholder: 'Paris-Charles de Gaulle',
    },
    { kind: 'text', name: 'city', label: 'City', required: true },
    {
      kind: 'select',
      name: 'country_id',
      label: 'Country',
      required: true,
      options: countries.map((country) => ({ value: country.id, label: country.name })),
    },
    {
      kind: 'text',
      name: 'timezone',
      label: 'IANA timezone',
      required: true,
      placeholder: 'Europe/Paris',
      hint: 'Used to work out the local departure and arrival times.',
    },
    { kind: 'number', name: 'latitude', label: 'Latitude', required: true, step: 0.0001, min: -90, max: 90 },
    {
      kind: 'number',
      name: 'longitude',
      label: 'Longitude',
      required: true,
      step: 0.0001,
      min: -180,
      max: 180,
    },
  ];
}

export function airlineFields(countries: Country[]): FieldSpec[] {
  return [
    { kind: 'text', name: 'iata', label: 'IATA code', required: true, placeholder: 'AF' },
    { kind: 'text', name: 'name', label: 'Name', required: true, span: 2 },
    {
      kind: 'select',
      name: 'country_id',
      label: 'Country of registration',
      required: true,
      options: countries.map((country) => ({ value: country.id, label: country.name })),
    },
    { kind: 'text', name: 'alliance', label: 'Alliance', placeholder: 'SkyTeam, Star Alliance…' },
    { kind: 'checkbox', name: 'active', label: 'Active airline' },
  ];
}

export const aircraftFields: FieldSpec[] = [
  { kind: 'text', name: 'code', label: 'Internal code', required: true, placeholder: 'A350' },
  { kind: 'text', name: 'model', label: 'Model', required: true, placeholder: 'A350-900' },
  { kind: 'text', name: 'manufacturer', label: 'Manufacturer', required: true, placeholder: 'Airbus' },
  { kind: 'number', name: 'capacity_economy', label: 'Economy seats', required: true, min: 0 },
  { kind: 'number', name: 'capacity_business', label: 'Business seats', required: true, min: 0 },
  { kind: 'number', name: 'capacity_first', label: 'First class seats', required: true, min: 0 },
  { kind: 'number', name: 'range_km', label: 'Range (km)', required: true, min: 100 },
  {
    kind: 'number',
    name: 'cruise_speed_kmh',
    label: 'Cruise speed (km/h)',
    required: true,
    min: 300,
  },
];

export const countryFields: FieldSpec[] = [
  { kind: 'text', name: 'code', label: 'ISO code', required: true, placeholder: 'FR' },
  { kind: 'text', name: 'name', label: 'Name', required: true },
  { kind: 'text', name: 'continent', label: 'Continent', required: true, placeholder: 'Europe' },
  { kind: 'text', name: 'currency', label: 'Currency', required: true, placeholder: 'EUR' },
  { kind: 'text', name: 'phone_code', label: 'Dialling code', required: true, placeholder: '+33' },
  {
    kind: 'textarea',
    name: 'visa_note',
    label: 'Entry requirements',
    span: 3,
    placeholder: 'Visa, permitted length of stay, passport validity…',
  },
];

export function userFields(withPassword: boolean): FieldSpec[] {
  const base: FieldSpec[] = [
    { kind: 'text', name: 'first_name', label: 'First name', required: true },
    { kind: 'text', name: 'last_name', label: 'Last name', required: true },
    { kind: 'email', name: 'email', label: 'Email address', required: true },
    { kind: 'text', name: 'phone', label: 'Phone' },
    {
      kind: 'select',
      name: 'role',
      label: 'Role',
      required: true,
      options: [
        { value: 'user', label: 'Customer' },
        { value: 'admin', label: 'Administrator' },
      ],
    },
    {
      kind: 'select',
      name: 'status',
      label: 'Status',
      required: true,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' },
      ],
    },
  ];

  if (withPassword) {
    base.push({
      kind: 'password',
      name: 'password',
      label: 'Password',
      required: true,
      hint: 'At least 12 characters, including a lowercase letter, an uppercase letter and a digit.',
    });
  }

  return base;
}
