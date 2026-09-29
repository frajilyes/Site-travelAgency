import 'server-only';
import mongoose, { type ClientSession, type PipelineStage, type Schema } from 'mongoose';
import { env, isProduction } from './env';

const URI = env.MONGODB_URI;
const DB_NAME = env.MONGODB_DB;

function assertEncryptedTransport(uri: string): void {
  if (!isProduction) return;

  const encrypted = uri.startsWith('mongodb+srv://') || /[?&]tls=true|[?&]ssl=true/i.test(uri);
  const loopback = /@?(127\.0\.0\.1|localhost|\[::1\])[:\/]/.test(uri);
  if (!encrypted && !loopback) {
    throw new Error(
      'MONGODB_URI points at a remote server without TLS. Use mongodb+srv:// or add ?tls=true.',
    );
  }
}
assertEncryptedTransport(URI);

mongoose.set('autoIndex', false);
mongoose.set('strictQuery', true);

declare global {
  var __travelMongoose: Promise<typeof mongoose> | undefined;
}

const connectionPromise: Promise<typeof mongoose> =
  globalThis.__travelMongoose ??
  mongoose.connect(URI, {
    dbName: DB_NAME,
    appName: 'skyroute',
    serverSelectionTimeoutMS: 15_000,
    maxPoolSize: 20,
    minPoolSize: 2,
    maxIdleTimeMS: 60_000,
    socketTimeoutMS: 45_000,
    retryWrites: true,
    writeConcern: { w: 'majority' },
  });
if (process.env.NODE_ENV !== 'production') globalThis.__travelMongoose = connectionPromise;

export function connectDB(): Promise<typeof mongoose> {
  return connectionPromise;
}

interface Counter {
  _id: string;
  seq: number;
}

export async function nextId(name: string, count = 1, session?: ClientSession): Promise<number> {
  await connectDB();
  const counters = mongoose.connection.collection<Counter>('counters');
  const counter = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: count } },
    { upsert: true, returnDocument: 'after', session },
  );
  return (counter?.seq ?? count) - count + 1;
}

export function autoIncrement(schema: Schema, sequenceName: string): void {
  schema.pre('validate', async function assignId() {
    if (this.isNew && this._id == null) {
      this._id = await nextId(sequenceName, 1, this.$session() ?? undefined);
    }
  });
}

const MAX_TERM_LENGTH = 64;

function escape(term: string): string {
  return term.slice(0, MAX_TERM_LENGTH).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function literal(term: string): RegExp {
  return new RegExp(escape(term), 'i');
}

export function startsWith(term: string): RegExp {
  return new RegExp(`^${escape(term)}`, 'i');
}

export function now(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

export type Stage = Record<string, unknown>;

export function pipeline(stages: Stage[]): PipelineStage[] {
  return stages as unknown as PipelineStage[];
}

export const AS_ENTITY: Stage[] = [{ $set: { id: '$_id' } }, { $unset: '_id' }];

export type Doc<T extends { id: number }> = Omit<T, 'id'> & { _id: number };

export function fromDoc<T extends { id: number }>(doc: Doc<T> | null | undefined): T | undefined {
  if (!doc) return undefined;
  const { _id, ...rest } = doc as Doc<T> & { _id: number };
  return { id: _id, ...rest } as unknown as T;
}

export function fromDocs<T extends { id: number }>(docs: Doc<T>[]): T[] {
  return docs.map((doc) => fromDoc<T>(doc)!);
}

let transactional: boolean | undefined;

async function supportsTransactions(): Promise<boolean> {
  if (transactional === undefined) {
    try {
      const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
      transactional = Boolean(hello.setName) || hello.msg === 'isdbgrid';
    } catch {
      transactional = false;
    }
  }
  return transactional;
}

export async function withTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
  await connectDB();
  if (!(await supportsTransactions())) return fn(undefined);

  const session = await mongoose.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result!;
  } finally {
    await session.endSession();
  }
}
