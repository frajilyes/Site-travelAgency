import 'server-only';
import * as z from 'zod';

const production = process.env.NODE_ENV === 'production';

const FORBIDDEN_SECRETS = new Set([
  'changeme',
  'secret',
  'development-secret-change-me-please',
  '00000000000000000000000000000000',
]);

function isLoopback(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

const optionalString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal('').transform(() => undefined));

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    MONGODB_URI: z.string().trim().min(1).default('mongodb://127.0.0.1:27017'),
    MONGODB_DB: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{1,63}$/, 'MONGODB_DB: invalid database name.')
      .default('skyroute'),

    SESSION_SECRET: z
      .string()
      .min(32, 'SESSION_SECRET must be at least 32 characters. Run `npm run setup`.'),
    PASSWORD_PEPPER: z
      .string()
      .min(16, 'PASSWORD_PEPPER must be at least 16 characters.')
      .optional(),

    APP_URL: z.url('APP_URL must be an absolute URL (https://…).').optional(),

    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),

    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,

    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    MAIL_FROM: optionalString,

    SEED_DAYS: z.coerce.number().int().min(1).max(365).default(28),
    SEED_DEMO_ACCOUNTS: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SEED_ON_BOOT: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
  })
  .superRefine((value, ctx) => {
    const secret = value.SESSION_SECRET.trim().toLowerCase();
    if (FORBIDDEN_SECRETS.has(secret) || /^(.)\1*$/.test(secret)) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_SECRET'],
        message: 'SESSION_SECRET is an example or trivial value — generate a new one.',
      });
    }

    if (Boolean(value.GOOGLE_CLIENT_ID) !== Boolean(value.GOOGLE_CLIENT_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['GOOGLE_CLIENT_ID'],
        message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET come as a pair.',
      });
    }

    if (Boolean(value.SMTP_USER) !== Boolean(value.SMTP_PASS)) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_USER'],
        message: 'SMTP_USER and SMTP_PASS come as a pair.',
      });
    }

    if (!production) return;

    if (!value.APP_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_URL'],
        message: 'APP_URL is required in production (the site’s public origin).',
      });
      return;
    }

    if (isLoopback(value.APP_URL)) return;

    if (!value.APP_URL.startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_URL'],
        message: 'APP_URL must use HTTPS for a publicly reachable site.',
      });
    }

    if (value.SEED_DEMO_ACCOUNTS) {
      ctx.addIssue({
        code: 'custom',
        path: ['SEED_DEMO_ACCOUNTS'],
        message:
          'SEED_DEMO_ACCOUNTS=true creates accounts whose passwords are public — not allowed on a live site.',
      });
    }

    if (!value.PASSWORD_PEPPER) {
      ctx.addIssue({
        code: 'custom',
        path: ['PASSWORD_PEPPER'],
        message:
          'PASSWORD_PEPPER is required on a live site: without it, a stolen database is enough to attack the passwords offline.',
      });
    }
  });

function load(): z.infer<typeof schema> {
  const parsed = schema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  const details = parsed.error.issues
    .map((issue) => `  · ${issue.path.join('.') || 'env'} — ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid configuration (.env):\n${details}`);
}

export const env = load();

export const isProduction = env.NODE_ENV === 'production';

export function appOrigin(): string {
  return (env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}
