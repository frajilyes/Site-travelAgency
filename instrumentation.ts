/**
 * Runs once when the server starts: creates the MongoDB indexes if needed and
 * fills an empty database with the reference data, the flight schedule and the
 * demo accounts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { ensureSeeded } = await import('./lib/seed');
  const started = Date.now();
  await ensureSeeded();
  console.log(`[skyroute] base de données prête en ${Date.now() - started} ms`);
}
