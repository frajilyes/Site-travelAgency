import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.MONGODB_DB ?? 'skyroute';

function readSeedArray(source, name) {
  const start = source.indexOf(`export const ${name}`);
  if (start === -1) throw new Error(`${name} not found in lib/seed-data.ts`);
  const open = source.indexOf('[', start);
  const close = source.indexOf('\n];', open);
  if (open === -1 || close === -1) throw new Error(`could not delimit ${name}`);
  return Function(`"use strict";return (${source.slice(open, close + 2)});`)();
}

const seedSource = readFileSync(new URL('../lib/seed-data.ts', import.meta.url), 'utf8');
const COUNTRIES = readSeedArray(seedSource, 'COUNTRIES');
const AIRPORTS = readSeedArray(seedSource, 'AIRPORTS');
const AIRLINES = readSeedArray(seedSource, 'AIRLINES');
const AIRCRAFT = readSeedArray(seedSource, 'AIRCRAFT');

async function sync(collection, key, rows, fields) {
  const operations = rows.map((row) => ({
    updateOne: {
      filter: { [key]: row[key] },
      update: { $set: Object.fromEntries(fields.map((field) => [field, row[field] ?? null])) },
    },
  }));

  const result = await mongoose.connection.collection(collection).bulkWrite(operations, {
    ordered: false,
  });
  return { matched: result.matchedCount, changed: result.modifiedCount };
}

try {
  await mongoose.connect(URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 10_000 });

  if ((await mongoose.connection.collection('countries').countDocuments()) === 0) {
    console.log('Database is empty — nothing to sync; the next server start will seed it.');
  } else {
    const jobs = [
      ['countries', 'code', COUNTRIES, ['name', 'continent', 'currency', 'phone_code', 'visa_note']],
      ['airports', 'iata', AIRPORTS, ['name', 'city']],
      ['airlines', 'iata', AIRLINES, ['name', 'alliance']],
      ['aircraft', 'code', AIRCRAFT, ['model', 'manufacturer']],
    ];

    for (const [collection, key, rows, fields] of jobs) {
      const { matched, changed } = await sync(collection, key, rows, fields);
      console.log(`${collection}: ${changed} updated, ${matched}/${rows.length} matched`);
    }
    console.log('Reference text synced from lib/seed-data.ts.');
  }
} catch (error) {
  console.error(`Could not sync reference data (${URI}): ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
