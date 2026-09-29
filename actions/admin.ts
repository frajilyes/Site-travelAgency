'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/dal';
import type { PublicUser } from '@/lib/types';
import { clientIp } from '@/lib/request';
import { RULES, consume, retryMessage } from '@/lib/rate-limit';
import { computeSchedule } from '@/lib/geo';
import { isDuplicateKey } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import {
  aircraftUsage,
  airlineUsage,
  airportUsage,
  countryUsage,
  createAircraft,
  createAirline,
  createAirport,
  createCountry,
  deleteAircraft,
  deleteAirline,
  deleteAirport,
  deleteCountry,
  getAircraft,
  getAirport,
  updateAircraft,
  updateAirline,
  updateAirport,
  updateCountry,
} from '@/lib/queries/reference';
import {
  createFlight,
  deleteFlight,
  flightBookingCount,
  setFlightStatus,
  updateFlight,
} from '@/lib/queries/flights';
import { setBookingStatus } from '@/lib/queries/bookings';
import {
  countAdmins,
  createUser,
  deleteUser,
  emailTaken,
  getUser,
  logAction,
  setUserRole,
  setUserStatus,
  updateProfile,
} from '@/lib/queries/users';
import {
  AircraftSchema,
  AirlineSchema,
  AirportSchema,
  AdminUserCreateSchema,
  AdminUserSchema,
  CountrySchema,
  BookingStatusSchema,
  FlightSchema,
  FlightStatusSchema,
  IdSchema,
  fieldErrors,
  type ActionState,
} from '@/lib/validation';

function duplicateMessage(error: unknown, field: string, label: string): ActionState | null {
  if (isDuplicateKey(error)) {
    return { errors: { [field]: [`${label} is already in use.`] } };
  }
  return null;
}

interface AdminContext {
  admin: PublicUser;
  ip: string;
  blocked: ActionState | null;
}

async function adminContext(): Promise<AdminContext> {
  const admin = await requireAdmin();
  const ip = await clientIp();
  const quota = await consume('admin:write', String(admin.id), RULES.adminWrite);
  return {
    admin,
    ip,
    blocked: quota.allowed ? null : { message: retryMessage(quota.retryAfterMs) },
  };
}

function readId(value: FormDataEntryValue | null): number | null {
  const parsed = IdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function readOptionalId(value: FormDataEntryValue | null): number | null | undefined {
  if (value === null || value === '') return undefined;
  return readId(value);
}

function refreshReference() {
  revalidatePath('/admin/countries');
  revalidatePath('/admin/airports');
  revalidatePath('/admin/airlines');
  revalidatePath('/admin/aircraft');
  revalidatePath('/admin/flights');
  revalidatePath('/destinations');
}

export async function saveCountry(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readOptionalId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };

  const parsed = CountrySchema.safeParse({
    code: formData.get('code'),
    name: formData.get('name'),
    continent: formData.get('continent'),
    currency: formData.get('currency'),
    phone_code: formData.get('phone_code'),
    visa_note: formData.get('visa_note') ?? '',
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const input = { ...parsed.data, visa_note: parsed.data.visa_note ? parsed.data.visa_note : null };

  try {
    if (id) {
      await updateCountry(id, input);
      await logAction({
        userId: admin.id,
        action: 'country.update',
        entity: 'country',
        entityId: id,
        details: `Country updated: ${input.name}`,
        ip,
      });
    } else {
      const newId = await createCountry(input);
      await logAction({
        userId: admin.id,
        action: 'country.create',
        entity: 'country',
        entityId: newId,
        details: `Country created: ${input.name}`,
        ip,
      });
    }
  } catch (error) {
    const duplicate = duplicateMessage(error, 'code', 'This country code');
    if (duplicate) return duplicate;
    throw error;
  }

  refreshReference();
  redirect('/admin/countries');
}

export async function removeCountry(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };
  if ((await countryUsage(id)) > 0) {
    return { message: 'This country is referenced by airports, airlines or passengers, so it cannot be deleted.' };
  }
  await deleteCountry(id);
  await logAction({
    userId: admin.id,
    action: 'country.delete',
    entity: 'country',
    entityId: id,
    details: 'Country deleted',
    ip,
  });
  refreshReference();
  return { success: true, message: 'Country deleted.' };
}

export async function saveAirport(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readOptionalId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };

  const parsed = AirportSchema.safeParse({
    iata: formData.get('iata'),
    icao: formData.get('icao') ?? '',
    name: formData.get('name'),
    city: formData.get('city'),
    country_id: formData.get('country_id'),
    timezone: formData.get('timezone'),
    latitude: formData.get('latitude'),
    longitude: formData.get('longitude'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  try {
    Intl.DateTimeFormat('en-US', { timeZone: parsed.data.timezone });
  } catch {
    return { errors: { timezone: ['Fuseau horaire inconnu (ex. Europe/Paris).'] } };
  }

  const input = { ...parsed.data, icao: parsed.data.icao ? parsed.data.icao : null };

  try {
    if (id) {
      await updateAirport(id, input);
      await logAction({
        userId: admin.id,
        action: 'airport.update',
        entity: 'airport',
        entityId: id,
        details: `Airport updated: ${input.iata}`,
        ip,
      });
    } else {
      const newId = await createAirport(input);
      await logAction({
        userId: admin.id,
        action: 'airport.create',
        entity: 'airport',
        entityId: newId,
        details: `Airport created: ${input.iata}`,
        ip,
      });
    }
  } catch (error) {
    const duplicate = duplicateMessage(error, 'iata', 'This IATA code');
    if (duplicate) return duplicate;
    throw error;
  }

  refreshReference();
  redirect('/admin/airports');
}

export async function removeAirport(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };
  if ((await airportUsage(id)) > 0) {
    return { message: 'Flights use this airport, so delete them first.' };
  }
  await deleteAirport(id);
  await logAction({
    userId: admin.id,
    action: 'airport.delete',
    entity: 'airport',
    entityId: id,
    details: 'Airport deleted',
    ip,
  });
  refreshReference();
  return { success: true, message: 'Airport deleted.' };
}

export async function saveAirline(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readOptionalId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };

  const parsed = AirlineSchema.safeParse({
    iata: formData.get('iata'),
    name: formData.get('name'),
    country_id: formData.get('country_id'),
    alliance: formData.get('alliance') ?? '',
    active: formData.get('active') ?? '',
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const input = {
    iata: parsed.data.iata,
    name: parsed.data.name,
    country_id: parsed.data.country_id,
    alliance: parsed.data.alliance ? parsed.data.alliance : null,
    active: parsed.data.active ? 1 : 0,
  };

  try {
    if (id) {
      await updateAirline(id, input);
      await logAction({
        userId: admin.id,
        action: 'airline.update',
        entity: 'airline',
        entityId: id,
        details: `Airline updated: ${input.name}`,
        ip,
      });
    } else {
      const newId = await createAirline(input);
      await logAction({
        userId: admin.id,
        action: 'airline.create',
        entity: 'airline',
        entityId: newId,
        details: `Airline created: ${input.name}`,
        ip,
      });
    }
  } catch (error) {
    const duplicate = duplicateMessage(error, 'iata', 'This IATA code');
    if (duplicate) return duplicate;
    throw error;
  }

  refreshReference();
  redirect('/admin/airlines');
}

export async function removeAirline(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };
  if ((await airlineUsage(id)) > 0) {
    return { message: 'Flights are operated by this airline, so delete them first.' };
  }
  await deleteAirline(id);
  await logAction({
    userId: admin.id,
    action: 'airline.delete',
    entity: 'airline',
    entityId: id,
    details: 'Airline deleted',
    ip,
  });
  refreshReference();
  return { success: true, message: 'Airline deleted.' };
}

export async function saveAircraft(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readOptionalId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };

  const parsed = AircraftSchema.safeParse({
    code: formData.get('code'),
    model: formData.get('model'),
    manufacturer: formData.get('manufacturer'),
    capacity_economy: formData.get('capacity_economy'),
    capacity_business: formData.get('capacity_business'),
    capacity_first: formData.get('capacity_first'),
    range_km: formData.get('range_km'),
    cruise_speed_kmh: formData.get('cruise_speed_kmh'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const total =
    parsed.data.capacity_economy + parsed.data.capacity_business + parsed.data.capacity_first;
  if (total === 0) {
    return { errors: { capacity_economy: ['The aircraft must have at least one seat.'] } };
  }

  try {
    if (id) {
      await updateAircraft(id, parsed.data);
      await logAction({
        userId: admin.id,
        action: 'aircraft.update',
        entity: 'aircraft',
        entityId: id,
        details: `Aircraft updated: ${parsed.data.model}`,
        ip,
      });
    } else {
      const newId = await createAircraft(parsed.data);
      await logAction({
        userId: admin.id,
        action: 'aircraft.create',
        entity: 'aircraft',
        entityId: newId,
        details: `Aircraft created: ${parsed.data.model}`,
        ip,
      });
    }
  } catch (error) {
    const duplicate = duplicateMessage(error, 'code', 'This aircraft code');
    if (duplicate) return duplicate;
    throw error;
  }

  refreshReference();
  redirect('/admin/aircraft');
}

export async function removeAircraft(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };
  if ((await aircraftUsage(id)) > 0) {
    return { message: 'Flights use this aircraft, so delete them first.' };
  }
  await deleteAircraft(id);
  await logAction({
    userId: admin.id,
    action: 'aircraft.delete',
    entity: 'aircraft',
    entityId: id,
    details: 'Aircraft deleted',
    ip,
  });
  refreshReference();
  return { success: true, message: 'Aircraft deleted.' };
}

export async function saveFlight(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readOptionalId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };

  const parsed = FlightSchema.safeParse({
    flight_number: formData.get('flight_number'),
    airline_id: formData.get('airline_id'),
    aircraft_id: formData.get('aircraft_id'),
    origin_id: formData.get('origin_id'),
    destination_id: formData.get('destination_id'),
    departure_time: formData.get('departure_time'),
    price_economy: formData.get('price_economy'),
    price_business: formData.get('price_business'),
    price_first: formData.get('price_first'),
    seats_economy: formData.get('seats_economy'),
    seats_business: formData.get('seats_business'),
    seats_first: formData.get('seats_first'),
    baggage_kg: formData.get('baggage_kg'),
    status: formData.get('status'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const data = parsed.data;
  if (data.origin_id === data.destination_id) {
    return { errors: { destination_id: ['Origin and destination must be different.'] } };
  }

  const origin = await getAirport(data.origin_id);
  const destination = await getAirport(data.destination_id);
  const aircraft = await getAircraft(data.aircraft_id);
  if (!origin || !destination || !aircraft) {
    return { message: 'Airport or aircraft not found.' };
  }

  if (
    data.seats_economy > aircraft.capacity_economy ||
    data.seats_business > aircraft.capacity_business ||
    data.seats_first > aircraft.capacity_first
  ) {
    return {
      errors: {
        seats_economy: [
          `Aircraft capacity exceeded (${aircraft.capacity_economy} economy / ${aircraft.capacity_business} business / ${aircraft.capacity_first} first).`,
        ],
      },
    };
  }

  const schedule = computeSchedule({
    origin,
    destination,
    cruiseSpeedKmh: aircraft.cruise_speed_kmh,
    departureLocal: data.departure_time,
  });

  if (schedule.distanceKm > aircraft.range_km) {
    return {
      errors: {
        aircraft_id: [
          `Distance of ${schedule.distanceKm} km exceeds the aircraft range (${aircraft.range_km} km).`,
        ],
      },
    };
  }

  const input = {
    ...data,
    arrival_time: schedule.arrivalLocal,
    departure_utc: schedule.departureUtc,
    duration_minutes: schedule.durationMinutes,
    distance_km: schedule.distanceKm,
  };

  try {
    if (id) {
      await updateFlight(id, input);
      await logAction({
        userId: admin.id,
        action: 'flight.update',
        entity: 'flight',
        entityId: id,
        details: `Flight updated: ${data.flight_number}`,
        ip,
      });
    } else {
      const newId = await createFlight(input);
      await logAction({
        userId: admin.id,
        action: 'flight.create',
        entity: 'flight',
        entityId: newId,
        details: `Flight created: ${data.flight_number}`,
        ip,
      });
    }
  } catch (error) {
    const duplicate = duplicateMessage(error, 'flight_number', 'This flight number on this date');
    if (duplicate) return duplicate;
    throw error;
  }

  revalidatePath('/admin/flights');
  revalidatePath('/flights');
  redirect('/admin/flights');
}

export async function changeFlightStatus(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };
  const status = FlightStatusSchema.safeParse(formData.get('status'));
  if (!status.success) return { message: 'Unknown status.' };

  await setFlightStatus(id, status.data);
  await logAction({
    userId: admin.id,
    action: 'flight.status',
    entity: 'flight',
    entityId: id,
    details: `Flight status: ${status.data}`,
    ip,
  });
  revalidatePath('/admin/flights');
  revalidatePath('/flights');
  return { success: true, message: 'Flight status updated.' };
}

export async function removeFlight(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };

  if ((await flightBookingCount(id)) > 0) {
    return {
      message:
        'Active bookings exist for this flight. Cancel them, or set the flight status to “cancelled”.',
    };
  }

  await deleteFlight(id);
  await logAction({
    userId: admin.id,
    action: 'flight.delete',
    entity: 'flight',
    entityId: id,
    details: 'Flight deleted',
    ip,
  });
  revalidatePath('/admin/flights');
  revalidatePath('/flights');
  return { success: true, message: 'Flight deleted.' };
}

export async function changeBookingStatus(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };
  const status = BookingStatusSchema.safeParse(formData.get('status'));
  if (!status.success) {
    return {
      message:
        'To cancel a booking, use the cancel button: it issues the refund and puts the seats back on sale.',
    };
  }

  await setBookingStatus(id, status.data);
  await logAction({
    userId: admin.id,
    action: 'booking.status',
    entity: 'booking',
    entityId: id,
    details: `Status changed to ${status.data}`,
    ip,
  });
  revalidatePath('/admin/bookings');
  return { success: true, message: 'Booking status updated.' };
}

export async function saveUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readOptionalId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };

  const raw = {
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? '',
    role: formData.get('role'),
    status: formData.get('status'),
    password: formData.get('password'),
  };

  if (id === undefined) {
    const parsed = AdminUserCreateSchema.safeParse(raw);
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };

    const data = parsed.data;
    if (await emailTaken(data.email)) {
      return { errors: { email: ['This email address is already in use.'] } };
    }

    const newId = await createUser({
      email: data.email,
      password_hash: await hashPassword(data.password),
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone ? data.phone : null,
      role: data.role,
    });
    await setUserStatus(newId, data.status);
    await logAction({
      userId: admin.id,
      action: 'user.create',
      entity: 'user',
      entityId: newId,
      details: `Account created: ${data.email}`,
      ip,
    });

    revalidatePath('/admin/users');
    redirect('/admin/users');
  }

  const parsed = AdminUserSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const data = parsed.data;
  if (await emailTaken(data.email, id)) {
    return { errors: { email: ['This email address is already in use.'] } };
  }

  {
    const current = await getUser(id);
    if (!current) return { message: 'User not found.' };

    const losesAdmin =
      current.role === 'admin' && (data.role !== 'admin' || data.status !== 'active');
    if (losesAdmin && (await countAdmins()) <= 1) {
      return { message: 'Not possible: at least one active administrator must remain.' };
    }

    await updateProfile(id, {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone ? data.phone : null,
    });
    await setUserRole(id, data.role);
    await setUserStatus(id, data.status);
    await logAction({
      userId: admin.id,
      action: 'user.update',
      entity: 'user',
      entityId: id,
      details: `Account updated: ${data.email}`,
      ip,
    });
  }

  revalidatePath('/admin/users');
  redirect('/admin/users');
}

export async function toggleUserStatus(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };
  const user = await getUser(id);
  if (!user) return { message: 'User not found.' };

  const next = user.status === 'active' ? 'suspended' : 'active';
  if (next === 'suspended' && user.role === 'admin' && (await countAdmins()) <= 1) {
    return { message: 'Not possible: at least one active administrator must remain.' };
  }
  if (next === 'suspended' && user.id === admin.id) {
    return { message: 'You cannot suspend your own account.' };
  }

  await setUserStatus(id, next);
  await logAction({
    userId: admin.id,
    action: 'user.status',
    entity: 'user',
    entityId: id,
    details: `Account ${next === 'active' ? 'reactivated' : 'suspended'}`,
    ip,
  });
  revalidatePath('/admin/users');
  return { success: true, message: next === 'active' ? 'Account reactivated.' : 'Account suspended.' };
}

export async function removeUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, ip, blocked } = await adminContext();
  if (blocked) return blocked;

  const id = readId(formData.get('id'));
  if (id === null) return { message: 'Invalid identifier.' };
  const user = await getUser(id);
  if (!user) return { message: 'User not found.' };

  if (user.id === admin.id) {
    return { message: 'You cannot delete your own account.' };
  }
  if (user.role === 'admin' && (await countAdmins()) <= 1) {
    return { message: 'Not possible: at least one active administrator must remain.' };
  }

  await deleteUser(id);
  await logAction({
    userId: admin.id,
    action: 'user.delete',
    entity: 'user',
    entityId: id,
    details: `Account deleted: ${user.email}`,
    ip,
  });
  revalidatePath('/admin/users');
  return { success: true, message: 'Account deleted, together with its bookings.' };
}
