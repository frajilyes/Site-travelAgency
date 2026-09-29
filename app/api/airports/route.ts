import { NextResponse } from 'next/server';
import { searchAirports } from '@/lib/queries/reference';
import { clientIp } from '@/lib/request';
import { RULES, consume } from '@/lib/rate-limit';
import { SearchSchema } from '@/lib/validation';

export async function GET(request: Request) {
  const quota = await consume('airports:ip', await clientIp(), RULES.search, { failOpen: true });
  if (!quota.allowed) {
    return NextResponse.json(
      { airports: [], error: 'Too many requests.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil(quota.retryAfterMs / 1000)) } },
    );
  }

  const parsed = SearchSchema.safeParse(new URL(request.url).searchParams.get('q') ?? '');
  const term = parsed.success ? parsed.data : '';
  if (term.length < 2) {
    return NextResponse.json({ airports: [] });
  }

  const found = await searchAirports(term);
  const airports = found.map((airport) => ({
    id: airport.id,
    iata: airport.iata,
    city: airport.city,
    name: airport.name,
    country_name: airport.country_name,
  }));

  return NextResponse.json({ airports });
}
