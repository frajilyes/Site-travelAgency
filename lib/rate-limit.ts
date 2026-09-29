import 'server-only';
import { createHash } from 'node:crypto';
import { connectDB } from './db';
import { RateLimitModel } from './models/security';

export interface Rule {
  limit: number;
  windowMs: number;
}

export interface Decision {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

const MINUTE = 60_000;

export const RULES = {
  loginByIp: { limit: 20, windowMs: 10 * MINUTE },
  loginByAccount: { limit: 5, windowMs: 15 * MINUTE },
  register: { limit: 5, windowMs: 60 * MINUTE },
  passwordChange: { limit: 5, windowMs: 15 * MINUTE },
  profileUpdate: { limit: 20, windowMs: 10 * MINUTE },
  booking: { limit: 10, windowMs: 10 * MINUTE },
  cancellation: { limit: 10, windowMs: 10 * MINUTE },
  oauthStart: { limit: 20, windowMs: 10 * MINUTE },
  search: { limit: 120, windowMs: MINUTE },
  adminWrite: { limit: 240, windowMs: 5 * MINUTE },
} as const satisfies Record<string, Rule>;

function fingerprint(identifier: string): string {
  return createHash('sha256').update(identifier).digest('base64url').slice(0, 22);
}

function windowStart(windowMs: number): number {
  return Math.floor(Date.now() / windowMs) * windowMs;
}

function documentId(bucket: string, identifier: string, windowMs: number): string {
  return `${bucket}:${fingerprint(identifier)}:${windowStart(windowMs)}`;
}

function decision(count: number, rule: Rule): Decision {
  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterMs: windowStart(rule.windowMs) + rule.windowMs - Date.now(),
  };
}

export async function consume(
  bucket: string,
  identifier: string,
  rule: Rule,
  { failOpen = false }: { failOpen?: boolean } = {},
): Promise<Decision> {
  try {
    await connectDB();
    const start = windowStart(rule.windowMs);
    const updated = await RateLimitModel.findOneAndUpdate(
      { _id: documentId(bucket, identifier, rule.windowMs) },
      {
        $inc: { count: 1 },
        $setOnInsert: { expires_at: new Date(start + rule.windowMs * 2) },
      },
      { upsert: true, returnDocument: 'after', lean: true },
    );
    return decision(updated?.count ?? 1, rule);
  } catch (error) {
    console.error('[skyroute] rate limiter unavailable:', error);
    return failOpen
      ? { allowed: true, remaining: 0, retryAfterMs: 0 }
      : { allowed: false, remaining: 0, retryAfterMs: rule.windowMs };
  }
}

export async function peek(bucket: string, identifier: string, rule: Rule): Promise<Decision> {
  try {
    await connectDB();
    const existing = await RateLimitModel.findOne({
      _id: documentId(bucket, identifier, rule.windowMs),
    }).lean<{ count: number } | null>();
    return decision((existing?.count ?? 0) + 1, rule);
  } catch (error) {
    console.error('[skyroute] rate limiter unavailable:', error);
    return { allowed: false, remaining: 0, retryAfterMs: rule.windowMs };
  }
}

export async function reset(bucket: string, identifier: string, rule: Rule): Promise<void> {
  try {
    await connectDB();
    await RateLimitModel.deleteOne({ _id: documentId(bucket, identifier, rule.windowMs) });
  } catch {}
}

export function retryMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / MINUTE));
  return `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
}
