import 'server-only';
import { AS_ENTITY, fromDoc, literal, now, pipeline, type Doc, type Stage } from '../db';
import { AuditLogModel, UserModel } from '../models/users';
import { BookingModel, PassengerModel, PaymentModel } from '../models/bookings';
import type { AuditLog, PublicUser, Role, UserStatus } from '../types';

const PUBLIC_PROJECTION = {
  email: 1,
  first_name: 1,
  last_name: 1,
  phone: 1,
  role: 1,
  status: 1,
  created_at: 1,
} as const;

const SESSION_PROJECTION = { ...PUBLIC_PROJECTION, session_version: 1 } as const;

const ACCOUNT_PROJECTION = { ...SESSION_PROJECTION, google_id: 1 } as const;

const CREDENTIALS_PROJECTION = {
  email: 1,
  password_hash: 1,
  role: 1,
  status: 1,
  session_version: 1,
} as const;

export interface UserAccount extends PublicUser {
  google_id: string | null;
  session_version: number;
}

export interface SessionUser extends PublicUser {
  session_version: number;
}

export interface UserCredentials {
  id: number;
  email: string;
  password_hash: string;
  role: Role;
  status: UserStatus;
  session_version: number;
}

function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

function withVersion<T extends { session_version?: number }>(record: T | undefined): T | undefined {
  if (!record) return undefined;
  if (typeof record.session_version !== 'number') record.session_version = 1;
  return record;
}

export async function backfillSessionVersions(): Promise<number> {
  const result = await UserModel.updateMany(
    { session_version: { $exists: false } },
    { $set: { session_version: 1 } },
  );
  return result.modifiedCount;
}

export async function findUserByEmail(email: string): Promise<UserAccount | undefined> {
  return withVersion(
    fromDoc<UserAccount>(
      await UserModel.findOne({ email: emailKey(email) }, ACCOUNT_PROJECTION).lean<
        Doc<UserAccount> | null
      >(),
    ),
  );
}

export async function findUserByGoogleId(googleId: string): Promise<UserAccount | undefined> {
  return withVersion(
    fromDoc<UserAccount>(
      await UserModel.findOne({ google_id: googleId }, ACCOUNT_PROJECTION).lean<
        Doc<UserAccount> | null
      >(),
    ),
  );
}

export async function findUserCredentials(email: string): Promise<UserCredentials | undefined> {
  return withVersion(
    fromDoc<UserCredentials>(
      await UserModel.findOne({ email: emailKey(email) }, CREDENTIALS_PROJECTION).lean<
        Doc<UserCredentials> | null
      >(),
    ),
  );
}

export async function findCredentialsById(id: number): Promise<UserCredentials | undefined> {
  return withVersion(
    fromDoc<UserCredentials>(
      await UserModel.findOne({ _id: id }, CREDENTIALS_PROJECTION).lean<
        Doc<UserCredentials> | null
      >(),
    ),
  );
}

export async function emailTaken(email: string, exceptId?: number): Promise<boolean> {
  const query: Stage = { email: emailKey(email) };
  if (exceptId !== undefined) query._id = { $ne: exceptId };
  return (await UserModel.countDocuments(query)) > 0;
}

export async function getUser(id: number): Promise<PublicUser | undefined> {
  return fromDoc<PublicUser>(
    await UserModel.findOne({ _id: id }, PUBLIC_PROJECTION).lean<Doc<PublicUser> | null>(),
  );
}

export async function findActiveUser(id: number): Promise<SessionUser | undefined> {
  return withVersion(
    fromDoc<SessionUser>(
      await UserModel.findOne({ _id: id, status: 'active' }, SESSION_PROJECTION).lean<
        Doc<SessionUser> | null
      >(),
    ),
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
  const timestamp = now();
  const created = await UserModel.create({
    email: emailKey(input.email),
    password_hash: input.password_hash,
    google_id: input.google_id ?? null,
    first_name: input.first_name,
    last_name: input.last_name,
    phone: input.phone,
    role: input.role ?? 'user',
    status: 'active',
    session_version: 1,
    created_at: timestamp,
    updated_at: timestamp,
  });
  return created._id;
}

export interface UserWithStats extends PublicUser {
  bookings: number;
  spent: number;
}

export async function listUsers(
  filter: { search?: string; role?: Role; status?: UserStatus } = {},
): Promise<UserWithStats[]> {
  const query: Stage = {};

  if (filter.search) {
    const like = literal(filter.search);
    query.$or = [{ email: like }, { first_name: like }, { last_name: like }];
  }
  if (filter.role) query.role = filter.role;
  if (filter.status) query.status = filter.status;

  return UserModel.aggregate<UserWithStats>(
    pipeline([
      { $match: query },
      { $sort: { created_at: -1 } },
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'user_id',
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
    ]),
  );
}

export async function updateProfile(
  id: number,
  input: { first_name: string; last_name: string; phone: string | null; email: string },
): Promise<void> {
  await UserModel.updateOne(
    { _id: id },
    {
      $set: {
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone,
        email: emailKey(input.email),
        updated_at: now(),
      },
    },
  );
}

export async function hasPassword(id: number): Promise<boolean> {
  const user = await UserModel.findOne({ _id: id }, { password_hash: 1 }).lean<{
    password_hash: string;
  } | null>();
  return Boolean(user?.password_hash);
}

export async function linkGoogleAccount(id: number, googleId: string): Promise<void> {
  await UserModel.updateOne({ _id: id }, { $set: { google_id: googleId, updated_at: now() } });
}

export async function updatePassword(id: number, passwordHash: string): Promise<void> {
  await UserModel.updateOne(
    { _id: id },
    { $set: { password_hash: passwordHash, updated_at: now() }, $inc: { session_version: 1 } },
  );
}

export async function refreshPasswordHash(id: number, passwordHash: string): Promise<void> {
  await UserModel.updateOne({ _id: id }, { $set: { password_hash: passwordHash } });
}

export async function setUserRole(id: number, role: Role): Promise<void> {
  await UserModel.updateOne(
    { _id: id },
    { $set: { role, updated_at: now() }, $inc: { session_version: 1 } },
  );
}

export async function setUserStatus(id: number, status: UserStatus): Promise<void> {
  await UserModel.updateOne(
    { _id: id },
    { $set: { status, updated_at: now() }, $inc: { session_version: 1 } },
  );
}

export async function revokeSessions(id: number): Promise<void> {
  await UserModel.updateOne({ _id: id }, { $inc: { session_version: 1 } });
}

export async function deleteUser(id: number): Promise<void> {
  const owned = await BookingModel.find({ user_id: id }, { _id: 1 }).lean<{ _id: number }[]>();
  const bookingIds = owned.map((booking) => booking._id);

  if (bookingIds.length > 0) {
    await Promise.all([
      PassengerModel.deleteMany({ booking_id: { $in: bookingIds } }),
      PaymentModel.deleteMany({ booking_id: { $in: bookingIds } }),
    ]);
    await BookingModel.deleteMany({ _id: { $in: bookingIds } });
  }

  await AuditLogModel.updateMany({ user_id: id }, { $set: { user_id: null } });
  await UserModel.deleteOne({ _id: id });
}

export async function countAdmins(): Promise<number> {
  return UserModel.countDocuments({ role: 'admin', status: 'active' });
}

export interface AuditInput {
  userId: number | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  details: string;
  ip?: string | null;
}

export async function logAction(entry: AuditInput): Promise<void> {
  await AuditLogModel.create({
    user_id: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entity_id:
      entry.entityId === null || entry.entityId === undefined ? null : String(entry.entityId),
    details: entry.details.slice(0, 500),
    ip: entry.ip ? entry.ip.slice(0, 64) : null,
    created_at: now(),
  });
}

export interface AuditEntry extends AuditLog {
  actor: string | null;
}

export async function listAuditLogs(limit = 100): Promise<AuditEntry[]> {
  return AuditLogModel.aggregate<AuditEntry>(
    pipeline([
      { $sort: { _id: -1 } },
      { $limit: Math.min(Math.max(1, Math.trunc(limit)), 500) },
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
    ]),
  );
}
