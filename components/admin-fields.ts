import type { FieldSpec } from './entity-form';
import type { Aircraft, Airline, AirportWithCountry, Country } from '@/lib/types';
import { CABIN_LABELS, FLIGHT_STATUS_LABELS, type FlightStatus } from '@/lib/types';

/** Field specs for the administration forms, kept next to each other for consistency. */

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
      label: 'Numéro de vol',
      required: true,
      placeholder: 'AF1234',
      hint: 'Code compagnie suivi de 1 à 4 chiffres.',
    },
    {
      kind: 'select',
      name: 'airline_id',
      label: 'Compagnie',
      required: true,
      options: airlines.map((airline) => ({
        value: airline.id,
        label: `${airline.name} (${airline.iata})`,
      })),
    },
    {
      kind: 'select',
      name: 'aircraft_id',
      label: 'Appareil',
      required: true,
      options: aircraft.map((plane) => ({
        value: plane.id,
        label: `${plane.manufacturer} ${plane.model} — ${plane.capacity_economy}/${plane.capacity_business}/${plane.capacity_first} sièges`,
      })),
    },
    {
      kind: 'select',
      name: 'origin_id',
      label: 'Aéroport de départ',
      required: true,
      options: airportOptions,
    },
    {
      kind: 'select',
      name: 'destination_id',
      label: "Aéroport d'arrivée",
      required: true,
      options: airportOptions,
    },
    {
      kind: 'datetime-local',
      name: 'departure_time',
      label: 'Départ (heure locale)',
      required: true,
      hint: 'La durée, la distance et l’heure d’arrivée sont calculées automatiquement.',
    },
    {
      kind: 'number',
      name: 'price_economy',
      label: `Tarif ${CABIN_LABELS.economy.toLowerCase()} (€)`,
      required: true,
      min: 0,
      step: 0.01,
    },
    {
      kind: 'number',
      name: 'price_business',
      label: `Tarif ${CABIN_LABELS.business.toLowerCase()} (€)`,
      required: true,
      min: 0,
      step: 0.01,
    },
    {
      kind: 'number',
      name: 'price_first',
      label: `Tarif ${CABIN_LABELS.first.toLowerCase()} (€)`,
      required: true,
      min: 0,
      step: 0.01,
    },
    { kind: 'number', name: 'seats_economy', label: 'Places économiques', required: true, min: 0 },
    { kind: 'number', name: 'seats_business', label: 'Places affaires', required: true, min: 0 },
    { kind: 'number', name: 'seats_first', label: 'Places première', required: true, min: 0 },
    {
      kind: 'number',
      name: 'baggage_kg',
      label: 'Franchise bagage (kg)',
      required: true,
      min: 0,
      max: 80,
    },
    {
      kind: 'select',
      name: 'status',
      label: 'Statut',
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
    { kind: 'text', name: 'iata', label: 'Code IATA', required: true, placeholder: 'CDG' },
    { kind: 'text', name: 'icao', label: 'Code OACI', placeholder: 'LFPG' },
    {
      kind: 'text',
      name: 'name',
      label: "Nom de l'aéroport",
      required: true,
      span: 2,
      placeholder: 'Paris-Charles de Gaulle',
    },
    { kind: 'text', name: 'city', label: 'Ville', required: true },
    {
      kind: 'select',
      name: 'country_id',
      label: 'Pays',
      required: true,
      options: countries.map((country) => ({ value: country.id, label: country.name })),
    },
    {
      kind: 'text',
      name: 'timezone',
      label: 'Fuseau horaire IANA',
      required: true,
      placeholder: 'Europe/Paris',
      hint: 'Sert à calculer les heures locales de départ et d’arrivée.',
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
    { kind: 'text', name: 'iata', label: 'Code IATA', required: true, placeholder: 'AF' },
    { kind: 'text', name: 'name', label: 'Nom', required: true, span: 2 },
    {
      kind: 'select',
      name: 'country_id',
      label: "Pays d'immatriculation",
      required: true,
      options: countries.map((country) => ({ value: country.id, label: country.name })),
    },
    { kind: 'text', name: 'alliance', label: 'Alliance', placeholder: 'SkyTeam, Star Alliance…' },
    { kind: 'checkbox', name: 'active', label: 'Compagnie active' },
  ];
}

export const aircraftFields: FieldSpec[] = [
  { kind: 'text', name: 'code', label: 'Code interne', required: true, placeholder: 'A350' },
  { kind: 'text', name: 'model', label: 'Modèle', required: true, placeholder: 'A350-900' },
  { kind: 'text', name: 'manufacturer', label: 'Constructeur', required: true, placeholder: 'Airbus' },
  { kind: 'number', name: 'capacity_economy', label: 'Sièges économiques', required: true, min: 0 },
  { kind: 'number', name: 'capacity_business', label: 'Sièges affaires', required: true, min: 0 },
  { kind: 'number', name: 'capacity_first', label: 'Sièges première', required: true, min: 0 },
  { kind: 'number', name: 'range_km', label: "Rayon d'action (km)", required: true, min: 100 },
  {
    kind: 'number',
    name: 'cruise_speed_kmh',
    label: 'Vitesse de croisière (km/h)',
    required: true,
    min: 300,
  },
];

export const countryFields: FieldSpec[] = [
  { kind: 'text', name: 'code', label: 'Code ISO', required: true, placeholder: 'FR' },
  { kind: 'text', name: 'name', label: 'Nom', required: true },
  { kind: 'text', name: 'continent', label: 'Continent', required: true, placeholder: 'Europe' },
  { kind: 'text', name: 'currency', label: 'Devise', required: true, placeholder: 'EUR' },
  { kind: 'text', name: 'phone_code', label: 'Indicatif', required: true, placeholder: '+33' },
  {
    kind: 'textarea',
    name: 'visa_note',
    label: "Formalités d'entrée",
    span: 3,
    placeholder: 'Visa, durée de séjour autorisée, validité du passeport…',
  },
];

export function userFields(withPassword: boolean): FieldSpec[] {
  const base: FieldSpec[] = [
    { kind: 'text', name: 'first_name', label: 'Prénom', required: true },
    { kind: 'text', name: 'last_name', label: 'Nom', required: true },
    { kind: 'email', name: 'email', label: 'Adresse e-mail', required: true },
    { kind: 'text', name: 'phone', label: 'Téléphone' },
    {
      kind: 'select',
      name: 'role',
      label: 'Rôle',
      required: true,
      options: [
        { value: 'user', label: 'Client' },
        { value: 'admin', label: 'Administrateur' },
      ],
    },
    {
      kind: 'select',
      name: 'status',
      label: 'Statut',
      required: true,
      options: [
        { value: 'active', label: 'Actif' },
        { value: 'suspended', label: 'Suspendu' },
      ],
    },
  ];

  if (withPassword) {
    base.push({
      kind: 'password',
      name: 'password',
      label: 'Mot de passe',
      required: true,
      hint: 'Au moins 8 caractères, dont une lettre et un chiffre.',
    });
  }

  return base;
}
