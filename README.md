# SkyRoute — online travel agency

A complete international flight booking application: search, comparison, multi-passenger booking,
payment, e-ticket, cancellation with refund, and an administration area covering the whole
reference dataset.

Everything really works: the data lives in a MongoDB database, seats are decremented on booking and
returned on cancellation, prices are calculated, and the business rules (ages, passports, aircraft
capacity, administrator quota) are enforced on the server.

## Getting started

You need a reachable MongoDB server: a local installation (`mongodb://127.0.0.1:27017`, the
default) or a MongoDB Atlas cluster.

```bash
npm install
npm run setup     # creates .env.local with random secrets
npm run dev       # http://localhost:3000
```

To point at a different server, set `MONGODB_URI` (and optionally `MONGODB_DB`) in `.env.local`:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net
MONGODB_DB=skyroute
```

On the first start the `skyroute` database is created, indexed and populated automatically: 35
countries, 55 airports, 27 airlines, 10 aircraft types and roughly 53,000 flights spread over the
next 28 days, plus two demonstration accounts.

### Demonstration accounts

They are only created when `SEED_DEMO_ACCOUNTS=true` (which is what `npm run setup` writes into
`.env.local`). Because their passwords are public, the value `true` is refused at startup as soon as
`APP_URL` points at anything other than the local machine.

| Role | Username | Password |
| --- | --- | --- |
| Administrator | `admin@skyroute.fr` | `Admin.SkyRoute2026` |
| Customer | `client@skyroute.fr` | `Client.SkyRoute2026` |

### Sign in with Google (optional)

The "Continue with Google" button only appears on `/login` and `/register` when an OAuth client is
configured:

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), fill in the
   OAuth consent screen, then create an **OAuth client ID** of type "Web application".
2. Add the authorised redirect URI, which must match `APP_URL` exactly:
   `http://localhost:3000/api/auth/google/callback`.
3. Complete `.env.local`:

```bash
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxx
APP_URL=http://localhost:3000
```

The flow uses the authorization code grant with PKCE; the returned `id_token` is verified against
Google's public keys. If the Google address matches an existing account, the account is simply
linked; otherwise a new account is created without a password and the "Security" section of the
profile says so.

### Confirmation email (SMTP)

The email goes out as soon as a booking is paid. That needs an SMTP account; with Gmail:

1. Enable two-step verification on the Google account.
2. Create an **app password** at <https://myaccount.google.com/apppasswords> (the account's normal
   password is refused by the SMTP server).
3. Complete `.env.local`:

```bash
SMTP_USER=your.address@gmail.com
SMTP_PASS=the16characters
MAIL_FROM=SkyRoute <your.address@gmail.com>
APP_URL=http://localhost:3000
```

Without these variables the booking still completes normally and a warning is written to the console
instead of sending. The SMTP connection requires TLS 1.2 at minimum and verifies the server
certificate: a plaintext send is refused rather than attempted.

## Features

### Public area

- **Flight search** by origin and destination airport (autocomplete on city, name or IATA code),
  date, cabin and party composition (adults, children, infants).
- **One way or round trip**: on a round trip the outbound and return legs are chosen separately and
  a summary shows the total before you continue.
- **Filters and sorting** by airline, maximum price, lowest price, duration or departure time.
- **Price calendar** over ±3 days, to spot a cheaper date.
- **Destination pages** per country: airports served, currency, dialling code, timezone, entry
  requirements and best fares departing from Paris.
- **Help, baggage allowances and terms and conditions of sale.**

### Booking

- One passenger entered per seat, with type (adult / child / infant), gender, nationality and
  passport. Ages are checked against the declared type and expired passports are refused.
- Pricing: full adult fare, −25% child, 10% infant, then 12% taxes and €22 of charges per passenger
  per segment. The breakdown is shown before payment.
- Payment by card (Luhn check, expiry date and security code), PayPal or bank transfer.
- Automatic seat allocation per passenger according to the cabin; infants travel on a lap and do not
  occupy a seat.
- Printable e-ticket with a six-character booking reference, seats, times, baggage allowance and
  transaction history.
- **Confirmation email** sent automatically to the contact address as soon as the booking is paid:
  reference, outbound and return flights, passengers, seats, price breakdown and a link to the
  booking.
- Online cancellation: full refund more than 7 days before departure, 50% between 7 days and 24
  hours, none after that. Released seats go straight back on sale.

### Customer area

- Editable profile and password change.
- Upcoming trips and history, with direct access to each ticket.

### Administration

- **Dashboard**: revenue by month, most booked routes, average basket, passengers carried, latest
  bookings and latest operations.
- **Flights**: create, edit, change status, delete, search and filter (airline, status, period),
  with pagination. Distance, duration and local arrival time are calculated automatically from the
  airports and the aircraft.
- **Bookings**: search, filter by status, change status and cancel with refund.
- **Users**: create, edit, change role, suspend, delete. The last active administrator cannot be
  suspended, deleted or demoted.
- **Reference data**: countries, airports, airlines and fleet, with integrity guards (an item that
  is still referenced cannot be deleted).
- **Audit log** of operations (sign-ins, bookings, changes, deletions).

## Architecture

```
app/          routes (App Router) — public pages, customer area, administration, API
actions/      Server Actions: authentication, booking, administration
components/   interface components, server and client
lib/          Mongoose connection, session, business rules
lib/db.ts     connection, id sequences, transactions, auto-increment plugin
lib/models/   Mongoose schemas and models, one file per domain
lib/queries/  data access per domain
lib/emails/   HTML and text templates for transactional emails
scripts/      development utilities
```

- **Next.js 16 (App Router)** with React Server Components and Server Actions; every mutation goes
  through a server action that revalidates its session before acting.
- **MongoDB via Mongoose**. One schema per entity (`lib/models/`), with the constraints the SQL
  schema expressed as `NOT NULL` and `CHECK` carried over as required fields and enumerations, and
  the `UNIQUE` ones as indexes created at startup (`ensureIndexes`, called once — `autoIndex` is
  disabled so they are not recreated on every model compilation). Documents keep a numeric key
  (`_id`) handed out by a `counters` collection, the equivalent of an `AUTOINCREMENT`; a schema
  plugin (`autoIncrement` in `lib/db.ts`) assigns it automatically on creation. All reads go through
  `.lean()`, which returns plain objects instead of hydrated Mongoose documents — faster, and
  necessary for a Server Component to be able to serialise them.
- **Booking integrity**: on a replica set, booking and cancellation run inside a transaction. On a
  standalone `mongod`, which does not offer them, each write records its undo and an error replays
  them backwards. In both cases the seat count is an `$inc` guarded by `$gte`: a seat cannot be sold
  twice. As MongoDB has no foreign keys, the cascades and forbidden deletions of the SQL schema are
  enforced in `lib/queries/` (see `deleteUser` and the `*Usage` functions).
- **Sessions** signed as JWTs (`jose`) in an `httpOnly`, `sameSite=lax` cookie, `secure` in
  production. `proxy.ts` performs optimistic route filtering, but the real authorisation is checked
  on every page and every action through the data access layer (`lib/dal.ts`), which re-reads the
  account from the database — a suspended account loses access immediately.
- **Passwords** hashed with `scrypt` and a random per-user salt, compared in constant time.
- **Validation** of forms with Zod, on the server, with per-field error messages.
- **Tailwind CSS 4** with a light/dark theme (system preference or a remembered manual choice).

## Commands

| Command | Effect |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm start` | production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run setup` | generates `.env.local` |
| `npm run db:reset` | drops the MongoDB database; it is recreated and reseeded on the next start |

## Environment variables

| Variable | Role |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string (default: `mongodb://127.0.0.1:27017`) |
| `MONGODB_DB` | database name (default: `skyroute`) |
| `SESSION_SECRET` | session signing key, 32 characters minimum (required) |
| `PASSWORD_PEPPER` | secret mixed into every password hash; required on a live site |
| `TRUSTED_PROXY_HOPS` | number of reverse proxies in front of the app, used to read the visitor's real IP (1 by default) |
| `GOOGLE_CLIENT_ID` | Google OAuth client id (optional: enables the "Continue with Google" button) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SEED_DAYS` | number of days of flights generated on the first start (28 by default) |
| `SEED_DEMO_ACCOUNTS` | creates the two demonstration accounts (`false` by default, refused on a live site) |
| `SEED_ON_BOOT` | populates the database at startup (`true` by default) |
| `SMTP_USER` | sending SMTP account, for example a Gmail address |
| `SMTP_PASS` | app password for the SMTP account |
| `SMTP_HOST` | SMTP server (`smtp.gmail.com` by default) |
| `SMTP_PORT` | SMTP port (`465` by default, implicit TLS; `587` for STARTTLS) |
| `SMTP_SECURE` | forces implicit TLS (`true` / `false`); inferred from the port otherwise |
| `MAIL_FROM` | displayed sender (`SkyRoute <address>` by default) |
| `APP_URL` | base for email links and the origin of the Google redirect URI (`http://localhost:3000` by default) |

All of these values are validated at startup (`lib/env.ts`): a secret that is too short, an
`APP_URL` in plaintext on a public domain, or a remote `MONGODB_URI` without TLS stops the server
with an explicit message, rather than silently disabling a protection.

`.env.example` gathers these variables ready to fill in. No `.env` file is tracked by Git; a secret
that has been exposed (a screenshot, a ticket, a public repository) must be regenerated at its
provider, not merely removed from the file.

## Security

| Area | Measure |
| --- | --- |
| Sessions | HS256-signed token (`iss`/`aud`/`sub`), `__Host-` `HttpOnly` `Secure` `SameSite=Lax` cookie, 2-hour sliding window and 7-day absolute cap, renewed by the proxy |
| Revocation | every account carries a `session_version`; a password, role or status change increments it and immediately invalidates every token issued before |
| Authorisation | `lib/dal.ts` re-reads the account from the database on every request: the role comes from the database, never from the token; the proxy only redirects |
| Passwords | scrypt (N=2¹⁵, r=8, p=2) over a peppered HMAC digest, constant-time comparison, automatic re-encoding of older digests, at most 4 concurrent computations |
| Brute force | quotas shared in the database (MongoDB TTL): 20 attempts / 10 min per IP, account locked after 5 failures / 15 min, separate quotas on registration, booking, cancellation and administration |
| CSRF | `Origin` / `Sec-Fetch-Site` check on every mutating request, on top of the control built into Server Actions |
| XSS | strict nonce-based Content-Security-Policy (`strict-dynamic`, `object-src 'none'`, `base-uri 'none'`), one nonce per response |
| Clickjacking | `frame-ancestors 'none'` and `X-Frame-Options: DENY` |
| Transport | two-year HSTS with `preload`, `upgrade-insecure-requests`, TLS required to MongoDB and to the SMTP server |
| Redirects | every `next` parameter is reduced to a path on this site (`//`, `/\` and control characters rejected) |
| Injection | queries typed and validated by Zod, metacharacters escaped in searches, form identifiers parsed and never coerced on the fly |
| Data | explicit projections: a password digest is only read by sign-in, and the card number is never stored — only the last four digits are |
| Traceability | timestamped audit log with the originating address, refused sign-ins included, viewable at `/admin/audit` |

## Notes

This is a demonstration project: no real payment is taken. Transactions, refunds and tickets are
recorded in the local database. Only the confirmation email really goes out, and only when an SMTP
account is configured.
