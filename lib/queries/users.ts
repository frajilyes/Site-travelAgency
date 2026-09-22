import 'server-only';
import type { Document } from 'mongodb';
import {
  AS_ENTITY,
  type Doc,
  auditLogsCol,
  bookingsCol,
  fromDoc,
  literal,
  nextId,
  now,
  passengersCol,
  paymentsCol,
  usersCol,
} from '../mongodb';
import type { AuditLog, PublicUser, Role, User, UserStatus } from '../types';

/** Never send the password hash or the Google id to a caller expecting a PublicUser. */
const PUBLIC_PROJECTION = {
  email: 1,
  first_name: 1,
  last_name: 1,
  phone: 1,
  role: 1,
  status: 1,
  created_at: 1,
} as const;

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const users = await usersCol();
  return fromDoc<User>(await users.findOne({ email: email.toLowerCase() }));
}

export async function findUserByGoogleId(googleId: string): Promise<User | undefined> {
  const users = await usersCol();
  return fromDoc<User>(await users.findOne({ google_id: googleId }));
}

export async function getUser(id: number): Promise<PublicUser | undefined> {
  const users = await usersCol();
  return fromDoc<PublicUser>(
    (await users.findOne({ _id: id }, { projection: PUBLIC_PROJECTION })) as Doc<PublicUser> | null,
  );
}

/** The check `getCurrentUser` runs on every request: the account must still be usable. */
export async function findActiveUser(id: number): Promise<PublicUser | undefined> {
  const users = await usersCol();
  return fromDoc<PublicUser>(
    (await users.findOne(
      { _id: id, status: 'active' },
      { projection: PUBLIC_PROJECTION },
    )) as Doc<PublicUser> | null,
  );
}

export interface NewUser {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role?: Role;
  google_id?: string | null;
}

export async function createUser(input: NewUser): Promise<number> {
  const users = await usersCol();
  const id = await nextId('users');
  const timestamp = now();

  await users.insertOne({
    _id: id,
    email: input.email.toLowerCase(),
    password_hash: input.password_hash,
    google_id: input.google_id ?? null,
    first_name: input.first_name,
    last_name: input.last_name,
    phone: input.phone,
    role: input.role ?? 'user',
    status: 'active',
    created_at: timestamp,
    updated_at: timestamp,
  });
  return id;
}

export interface UserWithStats extends PublicUser {
  bookings: number;
  spent: number;
}

export async function listUsers(
  filter: { search?: string; role?: Role; status?: UserStatus } = {},
): Promise<UserWithStats[]> {
  const query: Document = {};

  if (filter.search) {
    const like = literal(filter.search);
    query.$or = [{ email: like }, { first_name: like }, { last_name: like }];
  }
  if (filter.role) query.role = filter.role;
  if (filter.status) query.status = filter.status;

  const users = await usersCol();
  return users
    .aggregate<UserWithStats>([
      { $match: query },
      { $sort: { created_at: -1 } },
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'user_id',
          // Only the two fields the totals need, not the whole booking.
          pipeline: [{ $project: { _id: 0, status: 1, total_price: 1 } }],
          as: 'placed',
        },
      },
      {
        $set: {
          bookings: { $size: '$placed' },
          spent: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$placed',
                    as: 'booking',
                    cond: { $in: ['$$booking.status', ['confirmed', 'completed']] },
                  },
                },
                as: 'booking',
                in: '$$booking.total_price',
              },
            },
          },
        },
      },
      { $project: { ...PUBLIC_PROJECTION, bookings: 1, spent: 1 } },
      ...AS_ENTITY,
    ])
    .toArray();
}

export async function updateProfile(
  id: number,
  input: { first_name: string; last_name: string; phone: string | null; email: string },
): Promise<void> {
  const users = await usersCol();
  await users.updateOne(
    { _id: id },
    {
      $set: {
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone,
        email: input.email.toLowerCase(),
        updated_at: now(),
      },
    },
  );
}

/** False for Google-only accounts, which were created without a password. */
export async function hasPassword(id: number): Promise<boolean> {
  const users = await usersCol();
  const user = await users.findOne({ _id: id }, { projection: { password_hash: 1 } });
  return Boolean(user?.password_hash);
}

/** Attach a Google account to an existing user, matched on their e-mail. */
export async function linkGoogleAccount(id: number, googleId: string): Promise<void> {
  const users = await usersCol();
  await users.updateOne({ _id: id }, { $set: { google_id: googleId, updated_at: now() } });
}

export async function updatePassword(id: number, passwordHash: string): Promise<void> {
  const users = await usersCol();
  await users.updateOne({ _id: id }, { $set: { password_hash: passwordHash, updated_at: now() } });
}

export async function setUserRole(id: number, role: Role): Promise<void> {
  const users = await usersCol();
  await users.updateOne({ _id: id }, { $set: { role, updated_at: now() } });
}

export async function setUserStatus(id: number, status: UserStatus): Promise<void> {
  const users = await usersCol();
  await users.updateOne({ _id: id }, { $set: { status, updated_at: now() } });
}

/**
 * Delete a user with everything that hung off them. MongoDB has no foreign
 * keys, so the cascade the SQL schema declared is spelled out here: bookings
 * and their passengers and payments go, audit entries keep the trace but lose
 * the actor.
 */
export async function deleteUser(id: number): Promise<void> {
  const [users, bookings, passengers, payments, auditLogs] = await Promise.all([
    usersCol(),
    bookingsCol(),
    passengersCol(),
    paymentsCol(),
    auditLogsCol(),
  ]);

  const owned = await bookings.find({ user_id: id }, { projection: { _id: 1 } }).toArray();
  const bookingIds = owned.map((booking) => booking._id);

  if (bookingIds.length > 0) {
    await Promise.all([
      passengers.deleteMany({ booking_id: { $in: bookingIds } }),
      payments.deleteMany({ booking_id: { $in: bookingIds } }),
    ]);
    await bookings.deleteMany({ _id: { $in: bookingIds } });
  }

  await auditLogs.updateMany({ user_id: id }, { $set: { user_id: null } });
  await users.deleteOne({ _id: id });
}

export async function countAdmins(): Promise<number> {
  const users = await usersCol();
  return users.countDocuments({ role: 'admin', status: 'active' });
}

/** Append an entry to the administration audit trail. */
export async function logAction(
  userId: number | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  details: string,
): Promise<void> {
  const auditLogs = await auditLogsCol();
  await auditLogs.insertOne({
    _id: await nextId('audit_logs'),
    user_id: userId,
    action,
    entity,
    entity_id: entityId === null ? null : String(entityId),
    details,
    created_at: now(),
  });
}

export interface AuditEntry extends AuditLog {
  actor: string | null;
}

export async function listAuditLogs(limit = 100): Promise<AuditEntry[]> {
  const auditLogs = await auditLogsCol();
  return auditLogs
    .aggregate<AuditEntry>([
      { $sort: { _id: -1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'actor_user' } },
      {
        $set: {
          actor: {
            $let: {
              vars: { u: { $first: '$actor_user' } },
              in: {
                $cond: [
                  { $ifNull: ['$$u', false] },
                  { $concat: ['$$u.first_name', ' ', '$$u.last_name'] },
                  null,
                ],
              },
            },
          },
        },
      },
      { $unset: 'actor_user' },
      ...AS_ENTITY,
    ])
    .toArray();
}
