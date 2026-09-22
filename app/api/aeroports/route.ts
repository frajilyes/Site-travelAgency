import { NextResponse } from 'next/server';
import { searchAirports } from '@/lib/queries/reference';

/** Airport lookup backing the search form's combobox. */
export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get('q')?.trim() ?? '';
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
