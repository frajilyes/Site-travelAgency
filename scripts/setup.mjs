// Creates .env.local with a fresh session secret if it does not exist yet.
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

const FILE = '.env.local';

if (existsSync(FILE)) {
  console.log(`${FILE} existe déjà — rien à faire.`);
  process.exit(0);
}

const secret = randomBytes(48).toString('base64');
writeFileSync(
  FILE,
  `# Généré localement — ne pas committer.
SESSION_SECRET=${secret}

# Serveur MongoDB. Décommentez pour viser autre chose que l'instance locale.
# MONGODB_URI=mongodb://127.0.0.1:27017
# MONGODB_DB=skyroute
`,
);
console.log(`${FILE} créé avec un SESSION_SECRET aléatoire.`);
