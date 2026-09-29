export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  await import('./lib/env');

  const { ensureSeeded } = await import('./lib/seed');
  const started = Date.now();
  await ensureSeeded();
  console.log(`[skyroute] database ready in ${Date.now() - started} ms`);
}
