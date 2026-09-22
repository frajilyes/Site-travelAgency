import 'server-only';
import type { ClientSession, Document } from 'mongodb';
import {
  AS_ENTITY,
  type Doc,
  auditLogsCol,
  bookingsCol,
  flightsCol,
  fromDoc,
  fromDocs,
  literal,
  nextId,
  now,
  passengersCol,
  paymentsCol,
  usersCol,
  withTransaction,
} from '../mongodb';
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

/** Six-character booking reference, unique across the bookings collection. */
async function generateReference(session?: ClientSession): Promise<string> {
  const bookings = await bookingsCol();
  for (let attempt = 0; attempt < 50; attempt++) {
    let reference = '';
    for (let i = 0; i < 6; i++) {
      reference += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    const taken = await bookings.findOne({ reference }, { projection: { _id: 1 }, session });
    if (!taken) return reference;
  }
  throw new BookingError('Impossible de générer une référence de réservation. Réessayez.');
}

function mixOf(passengers: PassengerInput[]): PassengerMix {
  return {
    adult: passengers.filter((p) => p.passenger_type === 'adult').length,
    child: passengers.filter((p) => p.passenger_type === 'child').length,
    infant: passengers.filter((p) => p.passenger_type === 'infant').length,
  };
}

/**
 * Seat labels already held on a flight by bookings that are still active, for
 * the given cabin. Cancelled bookings release their seats, so their labels are
 * free to hand out again.
 */
async function occupiedSeats(
  flightId: number,
  cabin: CabinClass,
  session?: ClientSession,
): Promise<Set<string>> {
  const [bookings, passengers] = await Promise.all([bookingsCol(), passengersCol()]);

  const holders = await bookings
    .find(
      {
        $or: [{ outbound_flight_id: flightId }, { return_flight_id: flightId }],
        cabin_class: cabin,
        status: { $ne: 'cancelled' },
      },
      { projection: { outbound_flight_id: 1, return_flight_id: 1 }, session },
    )
    .toArray();

  const outbound = new Set(
    holders.filter((b) => b.outbound_flight_id === flightId).map((b) => b._id),
  );
  const inbound = new Set(holders.filter((b) => b.return_flight_id === flightId).map((b) => b._id));
  if (outbound.size === 0 && inbound.size === 0) return new Set();

  const rows = await passengers
    .find({ booking_id: { $in: [...new Set([...outbound, ...inbound])] } }, { session })
    .toArray();

  const seats = new Set<string>();
  for (const row of rows) {
    if (outbound.has(row.booking_id) && row.seat_outbound) seats.add(row.seat_outbound);
    if (inbound.has(row.booking_id) && row.seat_return) seats.add(row.seat_return);
  }
  return seats;
}

/**
 * Create a booking: validates availability, prices the trip, assigns seats,
 * records the payment and decrements the remaining seats.
 *
 * On a replica set the whole sequence runs in one transaction. On a standalone
 * `mongod`, which has no transactions, every write pushes its own undo onto
 * `rollback` and a failure replays them in reverse — so a half-written booking
 * never survives, and a sold-out flight is never oversold either way: the seat
 * decrement is a single conditional update that only applies while the seats
 * are actually there.
 */
export async function createBooking(
  request: BookingRequest,
): Promise<{ reference: string; total: number }> {
  const mix = mixOf(request.passengers);
  if (mix.adult < 1) {
    throw new BookingError('Au moins un passager adulte est requis.');
  }
  if (mix.infant > mix.adult) {
    throw new BookingError(
      "Chaque bébé doit voyager avec un adulte : il ne peut pas y avoir plus de bébés que d'adultes.",
    );
  }

  const outbound = await getFlight(request.outboundFlightId);
  if (!outbound) throw new BookingError("Le vol aller sélectionné n'existe plus.");

  const returnFlight = request.returnFlightId
    ? ((await getFlight(request.returnFlightId)) ?? null)
    : null;
  if (request.returnFlightId && !returnFlight) {
    throw new BookingError("Le vol retour sélectionné n'existe plus.");
  }
  if (returnFlight) {
    if (returnFlight.id === outbound.id) {
      throw new BookingError('Le vol retour doit être différent du vol aller.');
    }
    if (
      returnFlight.origin_id !== outbound.destination_id ||
      returnFlight.destination_id !== outbound.origin_id
    ) {
      throw new BookingError("Le vol retour ne correspond pas à l'itinéraire aller.");
    }
    if (returnFlight.departure_utc <= outbound.departure_utc) {
      throw new BookingError('Le vol retour doit partir après le vol aller.');
    }
  }

  const quote = computeQuote(outbound, returnFlight, request.cabin, mix);
  const segments = returnFlight ? [outbound.id, returnFlight.id] : [outbound.id];
  const seatField = `seats_${request.cabin}`;

  return withTransaction(async (session) => {
    const [flights, bookings, passengersCollection, payments, auditLogs] = await Promise.all([
      flightsCol(),
      bookingsCol(),
      passengersCol(),
      paymentsCol(),
      auditLogsCol(),
    ]);

    // Only used when the server has no transactions to roll back for us.
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
        const state = await flights.findOne(
          { _id: flightId },
          { projection: { [seatField]: 1, status: 1, departure_utc: 1 }, session },
        );
        if (!state) throw new BookingError('Vol introuvable.');
        if (state.status === 'cancelled') {
          throw new BookingError('Ce vol a été annulé par la compagnie.');
        }
        if (state.status === 'departed' || state.status === 'landed') {
          throw new BookingError("Ce vol est déjà parti : la réservation n'est plus possible.");
        }

        const available = (state as unknown as Record<string, number>)[seatField];
        if (available < quote.seats) {
          throw new BookingError(
            `Il ne reste que ${available} place(s) dans cette cabine pour l'un des vols sélectionnés.`,
          );
        }
        taken[flightId] = await occupiedSeats(flightId, request.cabin, session);
      }

      // Hold the seats before writing anything else: the `$gte` guard makes the
      // check and the decrement one atomic step, so two concurrent bookings for
      // the last seat cannot both succeed.
      for (const flightId of segments) {
        const held = await flights.updateOne(
          { _id: flightId, [seatField]: { $gte: quote.seats } },
          { $inc: { [seatField]: -quote.seats } },
          { session },
        );
        if (held.modifiedCount !== 1) {
          throw new BookingError(
            "Les dernières places de cette cabine viennent d'être vendues. Relancez une recherche.",
          );
        }
        rollback.push(() =>
          flights.updateOne({ _id: flightId }, { $inc: { [seatField]: quote.seats } }),
        );
      }

      /** Lowest seat label on this flight that no active booking holds. */
      const nextSeat = (flightId: number): string => {
        const held = taken[flightId];
        for (let index = 0; index < 1000; index++) {
          const label = seatLabel(request.cabin, index);
          if (!held.has(label)) {
            held.add(label);
            return label;
          }
        }
        throw new BookingError('Plus aucun siège attribuable dans cette cabine.');
      };

      const reference = await generateReference(session);
      const bookingId = await nextId('bookings', 1, session);

      await bookings.insertOne(
        {
          _id: bookingId,
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
        },
        { session },
      );
      rollback.push(() => bookings.deleteOne({ _id: bookingId }));

      const documents = request.passengers.map((passenger) => {
        // Infants travel on an adult's lap and are not given their own seat.
        const takesSeat = passenger.passenger_type !== 'infant';
        return {
          booking_id: bookingId,
          ...passenger,
          seat_outbound: takesSeat ? nextSeat(outbound.id) : null,
          seat_return: takesSeat && returnFlight ? nextSeat(returnFlight.id) : null,
        };
      });

      const firstPassengerId = await nextId('passengers', documents.length, session);
      await passengersCollection.insertMany(
        documents.map((document, index) => ({ _id: firstPassengerId + index, ...document })),
        { session },
      );
      rollback.push(() => passengersCollection.deleteMany({ booking_id: bookingId }));

      await payments.insertOne(
        {
          _id: await nextId('payments', 1, session),
          booking_id: bookingId,
          amount: quote.total,
          currency: 'EUR',
          method: request.paymentMethod,
          status: 'paid',
          card_last4: request.cardLast4,
          transaction_ref: `TX-${reference}-${Date.now().toString(36).toUpperCase()}`,
          created_at: now(),
        },
        { session },
      );
      rollback.push(() => payments.deleteMany({ booking_id: bookingId }));

      await auditLogs.insertOne(
        {
          _id: await nextId('audit_logs', 1, session),
          user_id: request.userId,
          action: 'booking.create',
          entity: 'booking',
          entity_id: String(bookingId),
          details: `${outbound.origin_iata} → ${outbound.destination_iata}${returnFlight ? ' (aller-retour)' : ''}, ${request.passengers.length} passager(s)`,
          created_at: now(),
        },
        { session },
      );

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

  const [passengersCollection, payments, users] = await Promise.all([
    passengersCol(),
    paymentsCol(),
    usersCol(),
  ]);

  const [passengerRows, paymentRows, customer, returnFlight] = await Promise.all([
    passengersCollection
      .aggregate<Passenger & { nationality: string }>([
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
      ])
      .toArray(),
    payments.find({ booking_id: booking.id }).sort({ _id: 1 }).toArray(),
    users.findOne(
      { _id: booking.user_id },
      {
        // Same columns the SQL version selected: never the password hash.
        projection: {
          email: 1,
          first_name: 1,
          last_name: 1,
          phone: 1,
          role: 1,
          status: 1,
          created_at: 1,
        },
      },
    ),
    booking.return_flight_id ? getFlight(booking.return_flight_id) : Promise.resolve(undefined),
  ]);

  return {
    ...booking,
    outbound,
    returnFlight: returnFlight ?? null,
    passengers: passengerRows,
    payments: fromDocs<Payment>(paymentRows),
    customer: fromDoc<PublicUser>(customer as unknown as Doc<PublicUser> | null)!,
  };
}

export async function getBookingByReference(reference: string): Promise<BookingDetail | undefined> {
  const bookings = await bookingsCol();
  const booking = fromDoc<Booking>(await bookings.findOne({ reference }));
  return booking ? hydrate(booking) : undefined;
}

export async function getBookingById(id: number): Promise<BookingDetail | undefined> {
  const bookings = await bookingsCol();
  const booking = fromDoc<Booking>(await bookings.findOne({ _id: id }));
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

/** The outbound flight, its airline, both airports and the customer. */
const SUMMARY_JOINS: Document[] = [
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

const SUMMARY_SHAPE: Document[] = [
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

async function summaries(stages: Document[], tail: Document[] = []): Promise<BookingSummary[]> {
  const bookings = await bookingsCol();
  return bookings
    .aggregate<BookingSummary>([...stages, ...SUMMARY_JOINS, ...tail, ...SUMMARY_SHAPE])
    .toArray();
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
  const match: Document = {};
  if (filter.status) match.status = filter.status;

  // Searches span the joined flight and customer, so it runs after the lookups.
  const search: Document[] = [];
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

  const perPage = filter.perPage ?? 25;
  const page = Math.max(1, filter.page ?? 1);

  // `$facet` counts and paginates off the same joined set, in one round trip.
  const bookings = await bookingsCol();
  const [result] = await bookings
    .aggregate<{ total: { n: number }[]; rows: BookingSummary[] }>([
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
    ])
    .toArray();

  return { rows: result?.rows ?? [], total: result?.total[0]?.n ?? 0 };
}

export interface CancellationResult {
  refund: number;
  rate: number;
}

/**
 * Cancel a booking, release its seats and register the refund due under the
 * cancellation policy. `actorId` is the user performing the cancellation.
 */
export async function cancelBooking(
  bookingId: number,
  actorId: number,
): Promise<CancellationResult> {
  return withTransaction(async (session) => {
    const [bookings, flights, passengers, payments, auditLogs] = await Promise.all([
      bookingsCol(),
      flightsCol(),
      passengersCol(),
      paymentsCol(),
      auditLogsCol(),
    ]);

    const booking = await bookings.findOne({ _id: bookingId }, { session });
    if (!booking) throw new BookingError('Réservation introuvable.');
    if (booking.status === 'cancelled') throw new BookingError('Cette réservation est déjà annulée.');
    if (booking.status === 'completed') {
      throw new BookingError('Un voyage déjà effectué ne peut pas être annulé.');
    }

    const outbound = await flights.findOne(
      { _id: booking.outbound_flight_id },
      { projection: { departure_utc: 1 }, session },
    );
    const rate = outbound ? refundRate(outbound.departure_utc) : 0;
    const refund = round(booking.total_price * rate);

    const seats = await passengers.countDocuments(
      { booking_id: bookingId, passenger_type: { $ne: 'infant' } },
      { session },
    );

    const flightIds = [booking.outbound_flight_id, booking.return_flight_id].filter(
      (id): id is number => typeof id === 'number',
    );
    const seatField = `seats_${booking.cabin_class}`;
    if (seats > 0 && flightIds.length > 0) {
      await flights.updateMany(
        { _id: { $in: flightIds } },
        { $inc: { [seatField]: seats } },
        { session },
      );
    }

    await bookings.updateOne(
      { _id: bookingId },
      { $set: { status: 'cancelled', cancelled_at: now() } },
      { session },
    );

    if (refund > 0) {
      await payments.insertOne(
        {
          _id: await nextId('payments', 1, session),
          booking_id: bookingId,
          amount: -refund,
          currency: 'EUR',
          method: 'card',
          status: 'refunded',
          card_last4: null,
          transaction_ref: `RF-${booking.reference}-${Date.now().toString(36).toUpperCase()}`,
          created_at: now(),
        },
        { session },
      );
    }

    await auditLogs.insertOne(
      {
        _id: await nextId('audit_logs', 1, session),
        user_id: actorId,
        action: 'booking.cancel',
        entity: 'booking',
        entity_id: String(bookingId),
        details: `Annulation de ${booking.reference} — remboursement ${refund.toFixed(2)} € (${Math.round(rate * 100)} %)`,
        created_at: now(),
      },
      { session },
    );

    return { refund, rate };
  });
}

/** Move a booking to another status from the administration area. */
export async function setBookingStatus(
  bookingId: number,
  status: BookingStatus,
  actorId: number,
): Promise<void> {
  const [bookings, auditLogs] = await Promise.all([bookingsCol(), auditLogsCol()]);

  await bookings.updateOne({ _id: bookingId }, { $set: { status } });
  await auditLogs.insertOne({
    _id: await nextId('audit_logs'),
    user_id: actorId,
    action: 'booking.status',
    entity: 'booking',
    entity_id: String(bookingId),
    details: `Statut passé à ${status}`,
    created_at: now(),
  });
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
  const [bookingsCollection, usersCollection, flightsCollection] = await Promise.all([
    bookingsCol(),
    usersCol(),
    flightsCol(),
  ]);

  const [[totals], users, flights, upcomingFlights] = await Promise.all([
    bookingsCollection
      .aggregate<{
        all: { n: number }[];
        confirmed: { n: number }[];
        cancelled: { n: number }[];
        earned: { total: number }[];
        travellers: { n: number }[];
      }>([
        {
          $facet: {
            all: [{ $count: 'n' }],
            confirmed: [{ $match: { status: 'confirmed' } }, { $count: 'n' }],
            cancelled: [{ $match: { status: 'cancelled' } }, { $count: 'n' }],
            earned: [
              { $match: { status: { $in: ['confirmed', 'completed'] } } },
              { $group: { _id: null, total: { $sum: '$total_price' } } },
            ],
            // A booking owns exactly `passenger_count` passenger documents, so
            // summing the field avoids walking the passengers collection.
            travellers: [
              { $match: { status: { $ne: 'cancelled' } } },
              { $group: { _id: null, n: { $sum: '$passenger_count' } } },
            ],
          },
        },
      ])
      .toArray(),
    usersCollection.countDocuments(),
    // 50 000+ documents, and the figure is only ever displayed: the metadata
    // count is instant where an exact count would scan the whole index.
    flightsCollection.estimatedDocumentCount(),
    flightsCollection.countDocuments({ departure_utc: { $gt: now() }, status: 'scheduled' }),
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
  const bookings = await bookingsCol();
  const rows = await bookings
    .aggregate<{ _id: string; total: number; bookings: number }>([
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
    ])
    .toArray();

  return rows.map(({ _id, ...rest }) => ({ month: _id, ...rest }));
}

export async function topRoutes(
  limit = 6,
): Promise<{ route: string; bookings: number; revenue: number }[]> {
  const bookings = await bookingsCol();
  const rows = await bookings
    .aggregate<{ _id: string; bookings: number; revenue: number }>([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $lookup: { from: 'flights', localField: 'outbound_flight_id', foreignField: '_id', as: 'f' },
      },
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
    ])
    .toArray();

  return rows.map(({ _id, ...rest }) => ({ route: _id, ...rest }));
}

export async function recentBookings(limit = 8): Promise<BookingSummary[]> {
  return summaries([{ $sort: { created_at: -1 } }, { $limit: limit }]);
}
