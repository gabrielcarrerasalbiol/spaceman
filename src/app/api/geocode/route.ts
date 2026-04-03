import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'spaceman-geocoder/1.0 (+https://spaceman.local)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Geocoding provider error (${response.status})` }, { status: 502 });
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      return NextResponse.json({ error: 'No results found for that address' }, { status: 404 });
    }

    const first = payload[0];
    return NextResponse.json({
      lat: first.lat,
      lon: first.lon,
      displayName: first.display_name || null,
    });
  } catch (error) {
    console.error('Geocoding failed:', error);
    return NextResponse.json({ error: 'Failed to geocode address' }, { status: 500 });
  }
}
