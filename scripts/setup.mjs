import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

const FILE = '.env.local';

if (existsSync(FILE)) {
  console.log(`${FILE} already exists — nothing to do.`);
  process.exit(0);
}

const sessionSecret = randomBytes(48).toString('base64');
const passwordPepper = randomBytes(32).toString('base64');

writeFileSync(
  FILE,
  `# Generated locally - never commit this file.
SESSION_SECRET=${sessionSecret}
PASSWORD_PEPPER=${passwordPepper}

# MongoDB server. Uncomment to point somewhere other than the local instance.
# MONGODB_URI=mongodb://127.0.0.1:27017
# MONGODB_DB=skyroute

# Demonstration accounts (admin@skyroute.fr / client@skyroute.fr).
# Refused in production: their passwords are public.
SEED_DEMO_ACCOUNTS=true
`,
  { mode: 0o600 },
);
console.log(`${FILE} created with a random SESSION_SECRET and PASSWORD_PEPPER.`);
