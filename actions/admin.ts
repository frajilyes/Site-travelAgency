'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/dal';
import { computeSchedule } from '@/lib/geo';
import { isDuplicateKey } from '@/lib/mongodb';
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
  findUserByEmail,
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
  FlightSchema,
  fieldErrors,
  type ActionState,
} from '@/lib/validation';

/** MongoDB reports a unique-index violation with the error code 11000. */
function duplicateMessage(error: unknown, field: string, label: string): ActionState | null {
  if (isDuplicateKey(error)) {
    return { errors: { [field]: [`${label} est déjà utilisé.`] } };
  }
  return null;
}

function refreshReference() {
  revalidatePath('/admin/pays');
  revalidatePath('/admin/aeroports');
  revalidatePath('/admin/compagnies');
  revalidatePath('/admin/avions');
  revalidatePath('/admin/vols');
  revalidatePath('/destinations');
}

/* ------------------------------------------------------------------ pays */

export async function saveCountry(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id')) || null;

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
      await logAction(admin.id, 'country.update', 'country', id, `Pays modifié : ${input.name}`);
    } else {
      const newId = await createCountry(input);
      await logAction(admin.id, 'country.create', 'country', newId, `Pays créé : ${input.name}`);
    }
  } catch (error) {
    const duplicate = duplicateMessage(error, 'code', 'Ce code pays');
    if (duplicate) return duplicate;
    throw error;
  }

  refreshReference();
  redirect('/admin/pays');
}

export async function removeCountry(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  if ((await countryUsage(id)) > 0) {
    return { message: 'Ce pays est référencé par des aéroports, compagnies ou passagers : suppression impossible.' };
  }
  await deleteCountry(id);
  await logAction(admin.id, 'country.delete', 'country', id, 'Pays supprimé');
  refreshReference();
  return { success: true, message: 'Pays supprimé.' };
}

/* -------------------------------------------------------------- aéroports */

export async function saveAirport(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id')) || null;

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
      await logAction(admin.id, 'airport.update', 'airport', id, `Aéroport modifié : ${input.iata}`);
    } else {
      const newId = await createAirport(input);
      await logAction(admin.id, 'airport.create', 'airport', newId, `Aéroport créé : ${input.iata}`);
    }
  } catch (error) {
    const duplicate = duplicateMessage(error, 'iata', 'Ce code IATA');
    if (duplicate) return duplicate;
    throw error;
  }

  refreshReference();
  redirect('/admin/aeroports');
}

export async function removeAirport(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  if ((await airportUsage(id)) > 0) {
    return { message: 'Des vols utilisent cet aéroport : supprimez-les d’abord.' };
  }
  await deleteAirport(id);
  await logAction(admin.id, 'airport.delete', 'airport', id, 'Aéroport supprimé');
  refreshReference();
  return { success: true, message: 'Aéroport supprimé.' };
}

/* ------------------------------------------------------------- compagnies */

export async function saveAirline(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id')) || null;

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
      await logAction(admin.id, 'airline.update', 'airline', id, `Compagnie modifiée : ${input.name}`);
    } else {
      const newId = await createAirline(input);
      await logAction(admin.id, 'airline.create', 'airline', newId, `Compagnie créée : ${input.name}`);
    }
  } catch (error) {
    const duplicate = duplicateMessage(error, 'iata', 'Ce code IATA');
    if (duplicate) return duplicate;
    throw error;
  }

  refreshReference();
  redirect('/admin/compagnies');
}

export async function removeAirline(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  if ((await airlineUsage(id)) > 0) {
    return { message: 'Des vols sont opérés par cette compagnie : supprimez-les d’abord.' };
  }
  await deleteAirline(id);
  await logAction(admin.id, 'airline.delete', 'airline', id, 'Compagnie supprimée');
  refreshReference();
  return { success: true, message: 'Compagnie supprimée.' };
}

/* ----------------------------------------------------------------- avions */

export async function saveAircraft(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id')) || null;

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
    return { errors: { capacity_economy: ['L’appareil doit avoir au moins un siège.'] } };
  }

  try {
    if (id) {
      await updateAircraft(id, parsed.data);
      await logAction(admin.id, 'aircraft.update', 'aircraft', id, `Appareil modifié : ${parsed.data.model}`);
    } else {
      const newId = await createAircraft(parsed.data);
      await logAction(admin.id, 'aircraft.create', 'aircraft', newId, `Appareil créé : ${parsed.data.model}`);
    }
  } catch (error) {
    const duplicate = duplicateMessage(error, 'code', 'Ce code appareil');
    if (duplicate) return duplicate;
    throw error;
  }

  refreshReference();
  redirect('/admin/avions');
}

export async function removeAircraft(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  if ((await aircraftUsage(id)) > 0) {
    return { message: 'Des vols utilisent cet appareil : supprimez-les d’abord.' };
  }
  await deleteAircraft(id);
  await logAction(admin.id, 'aircraft.delete', 'aircraft', id, 'Appareil supprimé');
  refreshReference();
  return { success: true, message: 'Appareil supprimé.' };
}

/* ------------------------------------------------------------------ vols */

export async function saveFlight(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id')) || null;

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
    return { errors: { destination_id: ['Le départ et l’arrivée doivent être différents.'] } };
  }

  const origin = await getAirport(data.origin_id);
  const destination = await getAirport(data.destination_id);
  const aircraft = await getAircraft(data.aircraft_id);
  if (!origin || !destination || !aircraft) {
    return { message: 'Aéroport ou appareil introuvable.' };
  }

  if (
    data.seats_economy > aircraft.capacity_economy ||
    data.seats_business > aircraft.capacity_business ||
    data.seats_first > aircraft.capacity_first
  ) {
    return {
      errors: {
        seats_economy: [
          `Capacité de l’appareil dépassée (${aircraft.capacity_economy} éco / ${aircraft.capacity_business} affaires / ${aircraft.capacity_first} première).`,
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
          `Distance de ${schedule.distanceKm} km supérieure au rayon d’action de l’appareil (${aircraft.range_km} km).`,
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
      await logAction(admin.id, 'flight.update', 'flight', id, `Vol modifié : ${data.flight_number}`);
    } else {
      const newId = await createFlight(input);
      await logAction(admin.id, 'flight.create', 'flight', newId, `Vol créé : ${data.flight_number}`);
    }
  } catch (error) {
    const duplicate = duplicateMessage(error, 'flight_number', 'Ce numéro de vol à cette date');
    if (duplicate) return duplicate;
    throw error;
  }

  revalidatePath('/admin/vols');
  revalidatePath('/vols');
  redirect('/admin/vols');
}

export async function changeFlightStatus(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  const status = String(formData.get('status'));

  if (!['scheduled', 'delayed', 'cancelled', 'departed', 'landed'].includes(status)) {
    return { message: 'Statut inconnu.' };
  }

  await setFlightStatus(id, status as 'scheduled');
  await logAction(admin.id, 'flight.status', 'flight', id, `Statut du vol : ${status}`);
  revalidatePath('/admin/vols');
  revalidatePath('/vols');
  return { success: true, message: 'Statut du vol mis à jour.' };
}

export async function removeFlight(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));

  if ((await flightBookingCount(id)) > 0) {
    return {
      message:
        'Des réservations actives portent sur ce vol. Annulez-les, ou passez le vol au statut « annulé ».',
    };
  }

  await deleteFlight(id);
  await logAction(admin.id, 'flight.delete', 'flight', id, 'Vol supprimé');
  revalidatePath('/admin/vols');
  revalidatePath('/vols');
  return { success: true, message: 'Vol supprimé.' };
}

/* --------------------------------------------------------- réservations */

export async function changeBookingStatus(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  const status = String(formData.get('status'));

  if (!['pending', 'confirmed', 'completed'].includes(status)) {
    return { message: 'Pour annuler une réservation, utilisez le bouton d’annulation (remboursement et remise en vente des sièges).' };
  }

  await setBookingStatus(id, status as 'confirmed', admin.id);
  revalidatePath('/admin/reservations');
  return { success: true, message: 'Statut de la réservation mis à jour.' };
}

/* ----------------------------------------------------------- utilisateurs */

export async function saveUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id')) || null;

  // A new account needs a password; editing an existing one leaves it untouched.
  const raw = {
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? '',
    role: formData.get('role'),
    status: formData.get('status'),
    password: formData.get('password'),
  };

  if (id === null) {
    const parsed = AdminUserCreateSchema.safeParse(raw);
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };

    const data = parsed.data;
    if (await findUserByEmail(data.email)) {
      return { errors: { email: ['Cette adresse e-mail est déjà utilisée.'] } };
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
    await logAction(admin.id, 'user.create', 'user', newId, `Compte créé : ${data.email}`);

    revalidatePath('/admin/utilisateurs');
    redirect('/admin/utilisateurs');
  }

  const parsed = AdminUserSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const data = parsed.data;
  const existing = await findUserByEmail(data.email);
  if (existing && existing.id !== id) {
    return { errors: { email: ['Cette adresse e-mail est déjà utilisée.'] } };
  }

  {
    const current = await getUser(id);
    if (!current) return { message: 'Utilisateur introuvable.' };

    const losesAdmin =
      current.role === 'admin' && (data.role !== 'admin' || data.status !== 'active');
    if (losesAdmin && (await countAdmins()) <= 1) {
      return { message: 'Impossible : il doit rester au moins un administrateur actif.' };
    }

    await updateProfile(id, {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone ? data.phone : null,
    });
    await setUserRole(id, data.role);
    await setUserStatus(id, data.status);
    await logAction(admin.id, 'user.update', 'user', id, `Compte modifié : ${data.email}`);
  }

  revalidatePath('/admin/utilisateurs');
  redirect('/admin/utilisateurs');
}

export async function toggleUserStatus(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  const user = await getUser(id);
  if (!user) return { message: 'Utilisateur introuvable.' };

  const next = user.status === 'active' ? 'suspended' : 'active';
  if (next === 'suspended' && user.role === 'admin' && (await countAdmins()) <= 1) {
    return { message: 'Impossible : il doit rester au moins un administrateur actif.' };
  }
  if (next === 'suspended' && user.id === admin.id) {
    return { message: 'Vous ne pouvez pas suspendre votre propre compte.' };
  }

  await setUserStatus(id, next);
  await logAction(admin.id, 'user.status', 'user', id, `Compte ${next === 'active' ? 'réactivé' : 'suspendu'}`);
  revalidatePath('/admin/utilisateurs');
  return { success: true, message: next === 'active' ? 'Compte réactivé.' : 'Compte suspendu.' };
}

export async function removeUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  const user = await getUser(id);
  if (!user) return { message: 'Utilisateur introuvable.' };

  if (user.id === admin.id) {
    return { message: 'Vous ne pouvez pas supprimer votre propre compte.' };
  }
  if (user.role === 'admin' && (await countAdmins()) <= 1) {
    return { message: 'Impossible : il doit rester au moins un administrateur actif.' };
  }

  await deleteUser(id);
  await logAction(admin.id, 'user.delete', 'user', id, `Compte supprimé : ${user.email}`);
  revalidatePath('/admin/utilisateurs');
  return { success: true, message: 'Compte supprimé, avec ses réservations.' };
}
