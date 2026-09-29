import 'server-only';
import { randomInt } from 'node:crypto';
import type { ClientSession } from 'mongoose';
import {
  AS_ENTITY,
  fromDoc,
  fromDocs,
  literal,
  nextId,
  now,
  pipeline,
  withTransaction,
  type Doc,
  type Stage,
} from '../db';
import { AuditLogModel, UserModel } from '../models/users';
import { FlightModel } from '../models/flights';
import { BookingModel, PassengerModel, PaymentModel } from '../models/bookings';
import { computeQuote, refundRate, round, seatLabel, type PassengerMix } from '../pricing';
import { getFlight } from './flights';
import type {
  Booking,
  BookingDetail,
  BookingStatus,
  CabinClass,
  Passenger,
  PaymentMethod,
  Payment,
  PublicUser,
} from '../types';

export interface PassengerInput {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'M' | 'F' | 'X';
  nationality_id: number;
  passport_number: string;
  passport_expiry: string;
  passenger_type: 'adult' | 'child' | 'infant';
}

export interface BookingRequest {
  userId: number;
  outboundFlightId: number;
  returnFlightId: number | null;
  cabin: CabinClass;
  passengers: PassengerInput[];
  contactEmail: string;
  contactPhone: string;
  paymentMethod: PaymentMethod;
  cardLast4: string | null;
}

export class BookingError extends Error {}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REFERENCE_LENGTH = 8;

async function generateReference(session?: ClientSession): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    let reference = '';
    for (let i = 0; i < REFERENCE_LENGTH; i++) {
      reference += ALPHABET[randomInt(ALPHABET.length)];
    }
    const taken = await BookingModel.findOne({ reference }, { _id: 1 }).session(session ?? null).lean();
    if (!taken) return reference;
  }
  throw new BookingError('Could not generate a booking reference. Please try again.');
}

function mixOf(passengers: PassengerInput[]): PassengerMix {
  return {
    adult: passengers.filter((p) => p.passenger_type === 'adult').length,
    child: passengers.filter((p) => p.passenger_type === 'child').length,
    infant: passengers.filter((p) => p.passenger_type === 'infant').length,
  };
}

async function occupiedSeats(
  flightId: number,
  cabin: CabinClass,
  session?: ClientSession,
): Promise<Set<string>> {
  const holders = await BookingModel.find(
    {
      $or: [{ outbound_flight_id: flightId }, { return_flight_id: flightId }],
      cabin_class: cabin,
      status: { $ne: 'cancelled' },
    },
    { outbound_flight_id: 1, return_flight_id: 1 },
  )
    .session(session ?? null)
    .lean<{ _id: number; outbound_flight_id: number; return_flight_id: number | null }[]>();

  const outbound = new Set(
    holders.filter((b) => b.outbound_flight_id === flightId).map((b) => b._id),
  );
  const inbound = new Set(holders.filter((b) => b.return_flight_id === flightId).map((b) => b._id));
  if (outbound.size === 0 && inbound.size === 0) return new Set();

  const rows = await PassengerModel.find({ booking_id: { $in: [...new Set([...outbound, ...inbound])] } })
    .session(session ?? null)
    .lean<{ booking_id: number; seat_outbound: string | null; seat_return: string | null }[]>();

  const seats = new Set<string>();
  for (const row of rows) {
    if (outbound.has(row.booking_id) && row.seat_outbound) seats.add(row.seat_outbound);
    if (inbound.has(row.booking_id) && row.seat_return) seats.add(row.seat_return);
  }
  return seats;
}

export async function createBooking(
  request: BookingRequest,
): Promise<{ reference: string; total: number }> {
  const mix = mixOf(request.passengers);
  if (mix.adult < 1) {
    throw new BookingError('At least one adult passenger is required.');
  }
  if (mix.infant > mix.adult) {
    throw new BookingError(
      'Each infant must travel with an adult: there cannot be more infants than adults.',
    );
  }

  const outbound = await getFlight(request.outboundFlightId);
  if (!outbound) throw new BookingError('The selected outbound flight no longer exists.');

  const returnFlight = request.returnFlightId
    ? ((await getFlight(request.returnFlightId)) ?? null)
    : null;
  if (request.returnFlightId && !returnFlight) {
    throw new BookingError('The selected return flight no longer exists.');
  }
  if (returnFlight) {
    if (returnFlight.id === outbound.id) {
      throw new BookingError('The return flight must be different from the outbound flight.');
    }
    if (
      returnFlight.origin_id !== outbound.destination_id ||
      returnFlight.destination_id !== outbound.origin_id
    ) {
      throw new BookingError('The return flight does not match the outbound itinerary.');
    }
    if (returnFlight.departure_utc <= outbound.departure_utc) {
      throw new BookingError('The return flight must depart after the outbound flight.');
    }
  }

  const quote = computeQuote(outbound, returnFlight, request.cabin, mix);
  const segments = returnFlight ? [outbound.id, returnFlight.id] : [outbound.id];
  const seatField = `seats_${request.cabin}`;

  return withTransaction(async (session) => {
    const rollback: (() => Promise<unknown>)[] = [];
    const undo = async () => {
      if (session) return;
      for (const step of [...rollback].reverse()) {
        await step().catch(() => undefined);
      }
    };

    try {
      const taken: Record<number, Set<string>> = {};

      for (const flightId of segments) {
        const state = await FlightModel.findOne({ _id: flightId }, { [seatField]: 1, status: 1 })
          .session(session ?? null)
          .lean<{ status: string } & Record<string, number>>();
        if (!state) throw new BookingError('Flight not found.');
        if (state.status === 'cancelled') {
          throw new BookingError('This flight was cancelled by the airline.');
        }
        if (state.status === 'departed' || state.status === 'landed') {
          throw new BookingError('This flight has already departed, so it can no longer be booked.');
        }

        const available = state[seatField];
        if (available < quote.seats) {
          throw new BookingError(
            `Only ${available} seat(s) left in this cabin on one of the selected flights.`,
          );
        }
        taken[flightId] = await occupiedSeats(flightId, request.cabin, session);
      }

      for (const flightId of segments) {
        const held = await FlightModel.updateOne(
          { _id: flightId, [seatField]: { $gte: quote.seats } },
          { $inc: { [seatField]: -quote.seats } },
        ).session(session ?? null);
        if (held.modifiedCount !== 1) {
          throw new BookingError(
            'The last seats in this cabin have just been sold. Please search again.',
          );
        }
        rollback.push(() => FlightModel.updateOne({ _id: flightId }, { $inc: { [seatField]: quote.seats } }));
      }

      const nextSeat = (flightId: number): string => {
        const held = taken[flightId];
        for (let index = 0; index < 1000; index++) {
          const label = seatLabel(request.cabin, index);
          if (!held.has(label)) {
            held.add(label);
            return label;
          }
        }
        throw new BookingError('No seat left to allocate in this cabin.');
      };

      const reference = await generateReference(session);
      const bookingDoc = new BookingModel({
        reference,
        user_id: request.userId,
        outbound_flight_id: request.outboundFlightId,
        return_flight_id: request.returnFlightId,
        cabin_class: request.cabin,
        passenger_count: request.passengers.length,
        base_price: quote.base,
        taxes: quote.taxes,
        total_price: quote.total,
        currency: 'EUR',
        status: 'confirmed',
        contact_email: request.contactEmail,
        contact_phone: request.contactPhone,
        created_at: now(),
        cancelled_at: null,
      });
      await bookingDoc.save({ session });
      const bookingId = bookingDoc._id;
      rollback.push(() => BookingModel.deleteOne({ _id: bookingId }));

      const documents = request.passengers.map((passenger) => {
        const takesSeat = passenger.passenger_type !== 'infant';
        return {
          booking_id: bookingId,
          ...passenger,
          seat_outbound: takesSeat ? nextSeat(outbound.id) : null,
          seat_return: takesSeat && returnFlight ? nextSeat(returnFlight.id) : null,
        };
      });

      const firstPassengerId = await nextId('passengers', documents.length, session);
      await PassengerModel.insertMany(
        documents.map((document, index) => ({ _id: firstPassengerId + index, ...document })),
        { session },
      );
      rollback.push(() => PassengerModel.deleteMany({ booking_id: bookingId }));

      const paymentDoc = new PaymentModel({
        booking_id: bookingId,
        amount: quote.total,
        currency: 'EUR',
        method: request.paymentMethod,
        status: 'paid',
        card_last4: request.cardLast4,
        transaction_ref: `TX-${reference}-${Date.now().toString(36).toUpperCase()}`,
        created_at: now(),
      });
      await paymentDoc.save({ session });
      rollback.push(() => PaymentModel.deleteMany({ booking_id: bookingId }));

      const logDoc = new AuditLogModel({
        user_id: request.userId,
        action: 'booking.create',
        entity: 'booking',
        entity_id: String(bookingId),
        details: `${outbound.origin_iata} → ${outbound.destination_iata}${returnFlight ? ' (aller-retour)' : ''}, ${request.passengers.length} passager(s)`,
        created_at: now(),
      });
      await logDoc.save({ session });

      return { reference, total: quote.total };
    } catch (error) {
      await undo();
      throw error;
    }
  });
}

async function hydrate(booking: Booking): Promise<BookingDetail | undefined> {
  const outbound = await getFlight(booking.outbound_flight_id);
  if (!outbound) return undefined;

  const [passengerRows, paymentRows, customer, returnFlight] = await Promise.all([
    PassengerModel.aggregate<Passenger & { nationality: string }>(
      pipeline([
        { $match: { booking_id: booking.id } },
        { $sort: { _id: 1 } },
        {
          $lookup: {
            from: 'countries',
            localField: 'nationality_id',
            foreignField: '_id',
            as: 'country',
          },
        },
        { $set: { nationality: { $ifNull: [{ $first: '$country.name' }, ''] } } },
        { $unset: 'country' },
        ...AS_ENTITY,
      ]),
    ),
    PaymentModel.find({ booking_id: booking.id }).sort({ _id: 1 }).lean<Doc<Payment>[]>(),
    UserModel.findOne(
      { _id: booking.user_id },
      {
        email: 1,
        first_name: 1,
        last_name: 1,
        phone: 1,
        role: 1,
        status: 1,
        created_at: 1,
      },
    ).lean<Doc<PublicUser> | null>(),
    booking.return_flight_id ? getFlight(booking.return_flight_id) : Promise.resolve(undefined),
  ]);

  return {
    ...booking,
    outbound,
    returnFlight: returnFlight ?? null,
    passengers: passengerRows,
    payments: fromDocs<Payment>(paymentRows),
    customer: fromDoc<PublicUser>(customer)!,
  };
}

export async function getBookingByReference(reference: string): Promise<BookingDetail | undefined> {
  const booking = fromDoc<Booking>(await BookingModel.findOne({ reference }).lean<Doc<Booking> | null>());
  return booking ? hydrate(booking) : undefined;
}

export async function getBookingById(id: number): Promise<BookingDetail | undefined> {
  const booking = fromDoc<Booking>(await BookingModel.findOne({ _id: id }).lean<Doc<Booking> | null>());
  return booking ? hydrate(booking) : undefined;
}

export interface BookingSummary extends Booking {
  origin_iata: string;
  destination_iata: string;
  origin_city: string;
  destination_city: string;
  departure_time: string;
  departure_utc: string;
  airline_name: string;
  flight_number: string;
  customer_name: string;
  customer_email: string;
}

const SUMMARY_JOINS: Stage[] = [
  { $lookup: { from: 'flights', localField: 'outbound_flight_id', foreignField: '_id', as: 'f' } },
  { $unwind: '$f' },
  { $lookup: { from: 'airlines', localField: 'f.airline_id', foreignField: '_id', as: 'al' } },
  { $lookup: { from: 'airports', localField: 'f.origin_id', foreignField: '_id', as: 'o' } },
  { $lookup: { from: 'airports', localField: 'f.destination_id', foreignField: '_id', as: 'd' } },
  { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'u' } },
  { $unwind: '$al' },
  { $unwind: '$o' },
  { $unwind: '$d' },
  { $unwind: '$u' },
];

const SUMMARY_SHAPE: Stage[] = [
  {
    $set: {
      origin_iata: '$o.iata',
      destination_iata: '$d.iata',
      origin_city: '$o.city',
      destination_city: '$d.city',
      departure_time: '$f.departure_time',
      departure_utc: '$f.departure_utc',
      flight_number: '$f.flight_number',
      airline_name: '$al.name',
      customer_name: { $concat: ['$u.first_name', ' ', '$u.last_name'] },
      customer_email: '$u.email',
    },
  },
  { $unset: ['f', 'al', 'o', 'd', 'u'] },
  ...AS_ENTITY,
];

async function summaries(stages: Stage[], tail: Stage[] = []): Promise<BookingSummary[]> {
  return BookingModel.aggregate<BookingSummary>(
    pipeline([...stages, ...SUMMARY_JOINS, ...tail, ...SUMMARY_SHAPE]),
  );
}

export async function listUserBookings(userId: number): Promise<BookingSummary[]> {
  return summaries([{ $match: { user_id: userId } }], [{ $sort: { departure_utc: -1 } }]);
}

export interface BookingFilter {
  search?: string;
  status?: BookingStatus;
  page?: number;
  perPage?: number;
}

export async function listBookings(
  filter: BookingFilter,
): Promise<{ rows: BookingSummary[]; total: number }> {
  const match: Stage = {};
  if (filter.status) match.status = filter.status;

  const search: Stage[] = [];
  if (filter.search) {
    const like = literal(filter.search);
    search.push({
      $match: {
        $or: [
          { reference: like },
          { 'u.email': like },
          { 'u.last_name': like },
          { 'f.flight_number': like },
        ],
      },
    });
  }

  const perPage = Math.min(Math.max(1, Math.trunc(filter.perPage ?? 25)), 100);
  const page = Math.min(Math.max(1, Math.trunc(filter.page ?? 1)), 10_000);

  const [result] = await BookingModel.aggregate<{ total: { n: number }[]; rows: BookingSummary[] }>(
    pipeline([
      { $match: match },
      ...SUMMARY_JOINS,
      ...search,
      {
        $facet: {
          total: [{ $count: 'n' }],
          rows: [
            { $sort: { created_at: -1 } },
            { $skip: (page - 1) * perPage },
            { $limit: perPage },
            ...SUMMARY_SHAPE,
          ],
        },
      },
    ]),
  );

  return { rows: result?.rows ?? [], total: result?.total[0]?.n ?? 0 };
}

export interface CancellationResult {
  refund: number;
  rate: number;
}

export async function cancelBooking(
  bookingId: number,
  actorId: number,
): Promise<CancellationResult> {
  return withTransaction(async (session) => {
    const booking = await BookingModel.findOne({ _id: bookingId }).session(session ?? null).lean<
      Doc<Booking>
    >();
    if (!booking) throw new BookingError('Booking not found.');
    if (booking.status === 'cancelled') throw new BookingError('This booking is already cancelled.');
    if (booking.status === 'completed') {
      throw new BookingError('A trip that has already been taken cannot be cancelled.');
    }

    const outbound = await FlightModel.findOne(
      { _id: booking.outbound_flight_id },
      { departure_utc: 1 },
    )
      .session(session ?? null)
      .lean<{ departure_utc: string } | null>();
    const rate = outbound ? refundRate(outbound.departure_utc) : 0;
    const refund = round(booking.total_price * rate);

    const seats = await PassengerModel.countDocuments({
      booking_id: bookingId,
      passenger_type: { $ne: 'infant' },
    }).session(session ?? null);

    const flightIds = [booking.outbound_flight_id, booking.return_flight_id].filter(
      (id): id is number => typeof id === 'number',
    );
    const seatField = `seats_${booking.cabin_class}`;
    if (seats > 0 && flightIds.length > 0) {
      await FlightModel.updateMany({ _id: { $in: flightIds } }, { $inc: { [seatField]: seats } }).session(
        session ?? null,
      );
    }

    await BookingModel.updateOne(
      { _id: bookingId },
      { $set: { status: 'cancelled', cancelled_at: now() } },
    ).session(session ?? null);

    if (refund > 0) {
      const refundDoc = new PaymentModel({
        booking_id: bookingId,
        amount: -refund,
        currency: 'EUR',
        method: 'card',
        status: 'refunded',
        card_last4: null,
        transaction_ref: `RF-${booking.reference}-${Date.now().toString(36).toUpperCase()}`,
        created_at: now(),
      });
      await refundDoc.save({ session });
    }

    const logDoc = new AuditLogModel({
      user_id: actorId,
      action: 'booking.cancel',
      entity: 'booking',
      entity_id: String(bookingId),
      details: `Annulation de ${booking.reference} — remboursement ${refund.toFixed(2)} € (${Math.round(rate * 100)} %)`,
      created_at: now(),
    });
    await logDoc.save({ session });

    return { refund, rate };
  });
}

export async function setBookingStatus(bookingId: number, status: BookingStatus): Promise<void> {
  await BookingModel.updateOne({ _id: bookingId }, { $set: { status } });
}

export interface DashboardStats {
  bookings: number;
  confirmed: number;
  cancelled: number;
  revenue: number;
  passengers: number;
  users: number;
  flights: number;
  upcomingFlights: number;
  averageBasket: number;
}

export async function dashboardStats(): Promise<DashboardStats> {
  const [[totals], users, flights, upcomingFlights] = await Promise.all([
    BookingModel.aggregate<{
      all: { n: number }[];
      confirmed: { n: number }[];
      cancelled: { n: number }[];
      earned: { total: number }[];
      travellers: { n: number }[];
    }>(
      pipeline([
        {
          $facet: {
            all: [{ $count: 'n' }],
            confirmed: [{ $match: { status: 'confirmed' } }, { $count: 'n' }],
            cancelled: [{ $match: { status: 'cancelled' } }, { $count: 'n' }],
            earned: [
              { $match: { status: { $in: ['confirmed', 'completed'] } } },
              { $group: { _id: null, total: { $sum: '$total_price' } } },
            ],
            travellers: [
              { $match: { status: { $ne: 'cancelled' } } },
              { $group: { _id: null, n: { $sum: '$passenger_count' } } },
            ],
          },
        },
      ]),
    ),
    UserModel.countDocuments(),
    FlightModel.estimatedDocumentCount(),
    FlightModel.countDocuments({ departure_utc: { $gt: now() }, status: 'scheduled' }),
  ]);

  const confirmed = totals?.confirmed[0]?.n ?? 0;
  const revenue = totals?.earned[0]?.total ?? 0;

  return {
    bookings: totals?.all[0]?.n ?? 0,
    confirmed,
    cancelled: totals?.cancelled[0]?.n ?? 0,
    revenue: round(revenue),
    passengers: totals?.travellers[0]?.n ?? 0,
    users,
    flights,
    upcomingFlights,
    averageBasket: confirmed > 0 ? round(revenue / confirmed) : 0,
  };
}

export async function revenueByMonth(
  months = 6,
): Promise<{ month: string; total: number; bookings: number }[]> {
  const rows = await BookingModel.aggregate<{ _id: string; total: number; bookings: number }>(
    pipeline([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      {
        $group: {
          _id: { $substrCP: ['$created_at', 0, 7] },
          total: { $sum: '$total_price' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: months },
    ]),
  );

  return rows.map(({ _id, ...rest }) => ({ month: _id, ...rest }));
}

export async function topRoutes(
  limit = 6,
): Promise<{ route: string; bookings: number; revenue: number }[]> {
  const rows = await BookingModel.aggregate<{ _id: string; bookings: number; revenue: number }>(
    pipeline([
      { $match: { status: { $ne: 'cancelled' } } },
      { $lookup: { from: 'flights', localField: 'outbound_flight_id', foreignField: '_id', as: 'f' } },
      { $unwind: '$f' },
      { $lookup: { from: 'airports', localField: 'f.origin_id', foreignField: '_id', as: 'o' } },
      { $lookup: { from: 'airports', localField: 'f.destination_id', foreignField: '_id', as: 'd' } },
      { $unwind: '$o' },
      { $unwind: '$d' },
      {
        $group: {
          _id: { $concat: ['$o.iata', ' → ', '$d.iata'] },
          bookings: { $sum: 1 },
          revenue: { $sum: '$total_price' },
        },
      },
      { $sort: { bookings: -1, revenue: -1 } },
      { $limit: limit },
    ]),
  );

  return rows.map(({ _id, ...rest }) => ({ route: _id, ...rest }));
}

export async function recentBookings(limit = 8): Promise<BookingSummary[]> {
  return summaries([{ $sort: { created_at: -1 } }, { $limit: limit }]);
}
