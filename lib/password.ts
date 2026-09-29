import 'server-only';
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { env } from './env';

const scryptAsync = promisify(scrypt) as (
  password: Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const PARAMS = { N: 2 ** 15, r: 8, p: 2, maxmem: 128 * 2 ** 15 * 8 * 3 } as const;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

const MAX_INPUT_LENGTH = 1024;

const PEPPERED = 'scryptp';
const PLAIN = 'scrypt';

const MAX_CONCURRENT = 4;

let running = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(work: () => Promise<T>): Promise<T> {
  while (running >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }

  running++;
  try {
    return await work();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

function normalize(password: string): string {
  return password.normalize('NFKC').slice(0, MAX_INPUT_LENGTH);
}

function pepper(password: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(normalize(password), 'utf8').digest();
}

function currentScheme(): typeof PEPPERED | typeof PLAIN {
  return env.PASSWORD_PEPPER ? PEPPERED : PLAIN;
}

function inputFor(scheme: string, password: string): Buffer | null {
  if (scheme === PEPPERED) {
    if (!env.PASSWORD_PEPPER) return null;
    return pepper(password, env.PASSWORD_PEPPER);
  }
  return Buffer.from(normalize(password), 'utf8');
}

export async function hashPassword(password: string): Promise<string> {
  const scheme = currentScheme();
  const salt = randomBytes(SALT_LENGTH);
  const input = inputFor(scheme, password)!;
  const derived = await withSlot(() => scryptAsync(input, salt, KEY_LENGTH, PARAMS));

  return [scheme, PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('hex'), derived.toString('hex')].join(
    '$',
  );
}

interface ParsedHash {
  scheme: string;
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
  legacy: boolean;
}

function parse(stored: string): ParsedHash | null {
  if (stored.startsWith(`${PEPPERED}$`) || stored.startsWith(`${PLAIN}$`)) {
    const [scheme, n, r, p, saltHex, keyHex] = stored.split('$');
    const parsed = {
      scheme,
      N: Number(n),
      r: Number(r),
      p: Number(p),
      salt: Buffer.from(saltHex ?? '', 'hex'),
      key: Buffer.from(keyHex ?? '', 'hex'),
      legacy: false,
    };

    const sane =
      Number.isInteger(parsed.N) &&
      parsed.N >= 2 ** 12 &&
      parsed.N <= 2 ** 18 &&
      Number.isInteger(parsed.r) &&
      parsed.r >= 1 &&
      parsed.r <= 16 &&
      Number.isInteger(parsed.p) &&
      parsed.p >= 1 &&
      parsed.p <= 8 &&
      parsed.salt.length > 0 &&
      parsed.key.length === KEY_LENGTH;

    return sane ? parsed : null;
  }

  const [saltHex, keyHex] = stored.split(':');
  if (!saltHex || !keyHex) return null;
  const salt = Buffer.from(saltHex, 'hex');
  const key = Buffer.from(keyHex, 'hex');
  return salt.length > 0 && key.length === KEY_LENGTH
    ? { scheme: PLAIN, N: 16384, r: 8, p: 1, salt, key, legacy: true }
    : null;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parse(stored);
  const spec = parsed ?? {
    scheme: currentScheme(),
    ...PARAMS,
    salt: randomBytes(SALT_LENGTH),
    key: randomBytes(KEY_LENGTH),
    legacy: false,
  };

  const input = inputFor(spec.scheme, password);
  if (!input) {
    console.error('[skyroute] PASSWORD_PEPPER manquant : empreintes illisibles.');
    return false;
  }

  const derived = await withSlot(() =>
    scryptAsync(input, spec.salt, spec.key.length, {
      N: spec.N,
      r: spec.r,
      p: spec.p,
      maxmem: Math.max(PARAMS.maxmem, 128 * spec.N * spec.r * 3),
    }).catch(() => null),
  );

  if (!derived || parsed === null) return false;
  return timingSafeEqual(derived, spec.key);
}

export function needsRehash(stored: string): boolean {
  const parsed = parse(stored);
  if (parsed === null || parsed.legacy) return true;
  if (parsed.scheme !== currentScheme()) return true;

  return parsed.N * parsed.r * parsed.p < PARAMS.N * PARAMS.r * PARAMS.p;
}
