'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { requireUser } from '@/lib/dal';
import { bookingConfirmationEmail } from '@/lib/emails/booking-confirmation';
import { sendMail } from '@/lib/mailer';
import {
  BookingError,
  cancelBooking,
  createBooking,
  getBookingById,
  getBookingByReference,
  type PassengerInput,
} from '@/lib/queries/bookings';
import { BookingSchema, PassengerSchema, fieldErrors, type ActionState } from '@/lib/validation';

/** Luhn checksum — the same check a payment gateway runs before authorising. */
function luhnValid(number: string): boolean {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

function expiryInFuture(expiry: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  // Valid through the last day of the stated month.
  return new Date(year, month, 1).getTime() > Date.now();
}

function ageOn(dateOfBirth: string, reference: Date): number {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = reference.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

export async function book(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const returnRaw = formData.get('return_flight_id');
  const parsed = BookingSchema.safeParse({
    outbound_flight_id: formData.get('outbound_flight_id'),
    return_flight_id: returnRaw && returnRaw !== '' ? returnRaw : null,
    cabin: formData.get('cabin'),
    contact_email: formData.get('contact_email'),
    contact_phone: formData.get('contact_phone'),
    payment_method: formData.get('payment_method'),
    card_number: formData.get('card_number') ?? '',
    card_holder: formData.get('card_holder') ?? '',
    card_expiry: formData.get('card_expiry') ?? '',
    card_cvc: formData.get('card_cvc') ?? '',
    accept_terms: formData.get('accept_terms') ?? '',
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const types = formData.getAll('passenger_type');
  if (types.length === 0) {
    return { message: 'Ajoutez au moins un passager.' };
  }
  if (types.length > 9) {
    return { message: 'Neuf passagers maximum par réservation.' };
  }

  const firstNames = formData.getAll('first_name');
  const lastNames = formData.getAll('last_name');
  const births = formData.getAll('date_of_birth');
  const genders = formData.getAll('gender');
  const nationalities = formData.getAll('nationality_id');
  const passports = formData.getAll('passport_number');
  const expiries = formData.getAll('passport_expiry');

  const errors: Record<string, string[]> = {};
  const passengers: PassengerInput[] = [];
  const now = new Date();

  for (let i = 0; i < types.length; i++) {
    const candidate = PassengerSchema.safeParse({
      first_name: firstNames[i],
      last_name: lastNames[i],
      date_of_birth: births[i],
      gender: genders[i],
      nationality_id: nationalities[i],
      passport_number: passports[i],
      passport_expiry: expiries[i],
      passenger_type: types[i],
    });

    if (!candidate.success) {
      for (const [field, messages] of Object.entries(fieldErrors(candidate.error))) {
        errors[`passenger.${i}.${field}`] = messages;
      }
      continue;
    }

    const age = ageOn(candidate.data.date_of_birth, now);
    if (age < 0 || age > 120) {
      errors[`passenger.${i}.date_of_birth`] = ['Date de naissance invalide.'];
    } else if (candidate.data.passenger_type === 'adult' && age < 12) {
      errors[`passenger.${i}.passenger_type`] = ['Un adulte doit avoir au moins 12 ans.'];
    } else if (candidate.data.passenger_type === 'child' && (age < 2 || age >= 12)) {
      errors[`passenger.${i}.passenger_type`] = ['Un enfant doit avoir entre 2 et 11 ans.'];
    } else if (candidate.data.passenger_type === 'infant' && age >= 2) {
      errors[`passenger.${i}.passenger_type`] = ['Un bébé doit avoir moins de 2 ans.'];
    }

    if (candidate.data.passport_expiry <= now.toISOString().slice(0, 10)) {
      errors[`passenger.${i}.passport_expiry`] = ['Le passeport est expiré.'];
    }

    passengers.push(candidate.data);
  }

  if (parsed.data.payment_method === 'card') {
    if (!luhnValid(parsed.data.card_number ?? '')) {
      errors.card_number = ['Numéro de carte invalide.'];
    }
    if ((parsed.data.card_holder ?? '').trim().length < 3) {
      errors.card_holder = ['Nom du titulaire requis.'];
    }
    if (!expiryInFuture(parsed.data.card_expiry ?? '')) {
      errors.card_expiry = ['Date d’expiration invalide ou dépassée (MM/AA).'];
    }
    if (!/^\d{3,4}$/.test((parsed.data.card_cvc ?? '').trim())) {
      errors.card_cvc = ['Cryptogramme à 3 ou 4 chiffres.'];
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, message: 'Certaines informations sont incomplètes ou invalides.' };
  }

  let reference: string;
  try {
    const result = await createBooking({
      userId: user.id,
      outboundFlightId: parsed.data.outbound_flight_id,
      returnFlightId: parsed.data.return_flight_id,
      cabin: parsed.data.cabin,
      passengers,
      contactEmail: parsed.data.contact_email,
      contactPhone: parsed.data.contact_phone,
      paymentMethod: parsed.data.payment_method,
      cardLast4:
        parsed.data.payment_method === 'card'
          ? (parsed.data.card_number ?? '').replace(/\D/g, '').slice(-4)
          : null,
    });
    reference = result.reference;
  } catch (error) {
    if (error instanceof BookingError) return { message: error.message };
    throw error;
  }

  // The e-ticket leaves after the response: a slow or unreachable mail server
  // must never hold up — or undo — a booking that is already paid.
  after(async () => {
    const booking = await getBookingByReference(reference);
    if (!booking) return;
    await sendMail({ to: booking.contact_email, ...bookingConfirmationEmail(booking) });
  });

  revalidatePath('/compte/reservations');
  redirect(`/reservation/${reference}`);
}

export async function cancel(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const bookingId = Number(formData.get('booking_id'));

  const booking = await getBookingById(bookingId);
  if (!booking) return { message: 'Réservation introuvable.' };
  if (booking.user_id !== user.id && user.role !== 'admin') {
    return { message: "Vous n'avez pas accès à cette réservation." };
  }

  try {
    const { refund, rate } = await cancelBooking(bookingId, user.id);
    revalidatePath('/compte/reservations');
    revalidatePath(`/reservation/${booking.reference}`);
    revalidatePath('/admin/reservations');
    return {
      success: true,
      message:
        refund > 0
          ? `Réservation annulée. Remboursement de ${refund.toFixed(2)} € (${Math.round(rate * 100)} % du montant payé).`
          : 'Réservation annulée. Aucun remboursement : le départ a lieu dans moins de 24 heures.',
    };
  } catch (error) {
    if (error instanceof BookingError) return { message: error.message };
    throw error;
  }
}
