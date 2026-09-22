// Drops the MongoDB database so the next server start recreates and reseeds it.
import { MongoClient } from 'mongodb';

const URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.MONGODB_DB ?? 'skyroute';

const client = new MongoClient(URI, { serverSelectionTimeoutMS: 10_000 });

try {
  await client.connect();
  const databases = await client.db().admin().listDatabases({ nameOnly: true });
  const exists = databases.databases.some((database) => database.name === DB_NAME);

  if (!exists) {
    console.log(`Aucune base « ${DB_NAME} » sur ${URI} — rien à supprimer.`);
  } else {
    await client.db(DB_NAME).dropDatabase();
    console.log(
      `Base « ${DB_NAME} » supprimée. Elle sera recréée et repeuplée au prochain démarrage.`,
    );
  }
} catch (error) {
  console.error(`Connexion à MongoDB impossible (${URI}) : ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.close();
}
