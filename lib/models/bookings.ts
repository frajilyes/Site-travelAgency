import 'server-only';
import mongoose, { Schema } from 'mongoose';
import { autoIncrement } from '../db';
import type {
  Booking,
  BookingStatus,
  CabinClass,
  Passenger,
  PassengerType,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../types';

type BookingDoc = Omit<Booking, 'id'> & { _id: number };
type PassengerDoc = Omit<Passenger, 'id'> & { _id: number };
type PaymentDoc = Omit<Payment, 'id'> & { _id: number };

const OPTIONS = { versionKey: false, id: false } as const;

const CABINS: CabinClass[] = ['economy', 'business', 'first'];
const BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed'];
const GENDERS: Passenger['gender'][] = ['M', 'F', 'X'];
const PASSENGER_TYPES: PassengerType[] = ['adult', 'child', 'infant'];
const PAYMENT_METHODS: PaymentMethod[] = ['card', 'paypal', 'bank_transfer'];
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'refunded', 'failed'];

const bookingSchema = new Schema<BookingDoc>(
  {
    _id: { type: Number },
    reference: { type: String, required: true },
    user_id: { type: Number, required: true },
    outbound_flight_id: { type: Number, required: true },
    return_flight_id: { type: Number, default: null },
    cabin_class: { type: String, required: true, enum: CABINS },
    passenger_count: { type: Number, required: true },
    base_price: { type: Number, required: true },
    taxes: { type: Number, required: true },
    total_price: { type: Number, required: true },
    currency: { type: String, required: true, default: 'EUR' },
    status: { type: String, required: true, enum: BOOKING_STATUSES, default: 'pending' },
    contact_email: { type: String, required: true },
    contact_phone: { type: String, required: true },
    created_at: { type: String, required: true },
    cancelled_at: { type: String, default: null },
  },
  OPTIONS,
);
bookingSchema.index({ reference: 1 }, { unique: true, name: 'uniq_bookings_reference' });
bookingSchema.index({ user_id: 1 }, { name: 'idx_bookings_user' });
bookingSchema.index({ status: 1 }, { name: 'idx_bookings_status' });
bookingSchema.index({ outbound_flight_id: 1 }, { name: 'idx_bookings_outbound' });
bookingSchema.index({ return_flight_id: 1 }, { name: 'idx_bookings_return' });
bookingSchema.index({ created_at: -1 }, { name: 'idx_bookings_created' });
autoIncrement(bookingSchema, 'bookings');

const passengerSchema = new Schema<PassengerDoc>(
  {
    _id: { type: Number },
    booking_id: { type: Number, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    date_of_birth: { type: String, required: true },
    gender: { type: String, required: true, enum: GENDERS },
    nationality_id: { type: Number, required: true },
    passport_number: { type: String, required: true },
    passport_expiry: { type: String, required: true },
    passenger_type: { type: String, required: true, enum: PASSENGER_TYPES },
    seat_outbound: { type: String, default: null },
    seat_return: { type: String, default: null },
  },
  OPTIONS,
);
passengerSchema.index({ booking_id: 1 }, { name: 'idx_passengers_booking' });
passengerSchema.index({ nationality_id: 1 }, { name: 'idx_passengers_nationality' });
autoIncrement(passengerSchema, 'passengers');

const paymentSchema = new Schema<PaymentDoc>(
  {
    _id: { type: Number },
    booking_id: { type: Number, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'EUR' },
    method: { type: String, required: true, enum: PAYMENT_METHODS },
    status: { type: String, required: true, enum: PAYMENT_STATUSES },
    card_last4: { type: String, default: null },
    transaction_ref: { type: String, required: true },
    created_at: { type: String, required: true },
  },
  OPTIONS,
);
paymentSchema.index({ transaction_ref: 1 }, { unique: true, name: 'uniq_payments_transaction' });
paymentSchema.index({ booking_id: 1 }, { name: 'idx_payments_booking' });
autoIncrement(paymentSchema, 'payments');

export const BookingModel =
  (mongoose.models.Booking as mongoose.Model<BookingDoc>) ??
  mongoose.model<BookingDoc>('Booking', bookingSchema, 'bookings');

export const PassengerModel =
  (mongoose.models.Passenger as mongoose.Model<PassengerDoc>) ??
  mongoose.model<PassengerDoc>('Passenger', passengerSchema, 'passengers');

export const PaymentModel =
  (mongoose.models.Payment as mongoose.Model<PaymentDoc>) ??
  mongoose.model<PaymentDoc>('Payment', paymentSchema, 'payments');
