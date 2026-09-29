import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.MONGODB_DB ?? 'skyroute';

try {
  await mongoose.connect(URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 10_000 });
  const databases = await mongoose.connection.db.admin().listDatabases({ nameOnly: true });
  const exists = databases.databases.some((database) => database.name === DB_NAME);

  if (!exists) {
    console.log(`No database "${DB_NAME}" on ${URI} — nothing to drop.`);
  } else {
    await mongoose.connection.dropDatabase();
    console.log(
      `Database "${DB_NAME}" dropped. It will be recreated and reseeded on the next start.`,
    );
  }
} catch (error) {
  console.error(`Could not connect to MongoDB (${URI}): ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
