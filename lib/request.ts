import 'server-only';
import { headers } from 'next/headers';
import { env } from './env';

const UNKNOWN_IP = 'unknown';

const SANDBOX_ORIGIN = 'https://skyroute.invalid';

function normalizeIp(value: string): string {
  const address = value.trim();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  return (mapped?.[1] ?? address).toLowerCase();
}

export async function clientIp(): Promise<string> {
  const store = await headers();
  const hops = env.TRUSTED_PROXY_HOPS;

  if (hops > 0) {
    const chain = (store.get('x-forwarded-for') ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    const address = chain[chain.length - hops];
    if (address) return normalizeIp(address);
  }

  const real = store.get('x-real-ip');
  return real ? normalizeIp(real) : UNKNOWN_IP;
}

export function safeRelativePath(value: unknown, fallback: string | null = null): string | null {
  if (typeof value !== 'string') return fallback;

  const candidate = value.trim();
  if (candidate.length === 0 || candidate.length > 512) return fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(candidate)) return fallback;

  try {
    const resolved = new URL(candidate, SANDBOX_ORIGIN);
    if (resolved.origin !== SANDBOX_ORIGIN) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export function isSameOrigin(request: Request, allowed: string): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(allowed).origin;
  } catch {
    return false;
  }
}
