import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// SkyGuard Geocode API - Real-Time via Open-Meteo (Free, No Key)
// Open-Meteo provides free geocoding without requiring any API key.
// ============================================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 20;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Sanitize search query - only allow alphanumeric, spaces, commas
function sanitizeQuery(q: string): string {
  return q.replace(/[^a-zA-Z0-9\s,.-]/g, '').slice(0, 100);
}

// Popular cities for default display
const CITIES = [
  { name: 'New York', country: 'US', state: 'NY', lat: 40.7128, lon: -74.006 },
  { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
  { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
  { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
  { name: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093 },
  { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708 },
  { name: 'Mumbai', country: 'IN', lat: 19.076, lon: 72.8777 },
  { name: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198 },
  { name: 'Berlin', country: 'DE', lat: 52.52, lon: 13.405 },
  { name: 'Toronto', country: 'CA', lat: 43.6532, lon: -79.3832 },
  { name: 'Moscow', country: 'RU', lat: 55.7558, lon: 37.6173 },
  { name: 'Beijing', country: 'CN', lat: 39.9042, lon: 116.4074 },
  { name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978 },
  { name: 'Bangkok', country: 'TH', lat: 13.7563, lon: 100.5018 },
  { name: 'Cairo', country: 'EG', lat: 30.0444, lon: 31.2357 },
  { name: 'Rio de Janeiro', country: 'BR', lat: -22.9068, lon: -43.1729 },
  { name: 'Los Angeles', country: 'US', state: 'CA', lat: 34.0522, lon: -118.2437 },
  { name: 'Chicago', country: 'US', state: 'IL', lat: 41.8781, lon: -87.6298 },
  { name: 'San Francisco', country: 'US', state: 'CA', lat: 37.7749, lon: -122.4194 },
  { name: 'Delhi', country: 'IN', lat: 28.7041, lon: 77.1025 },
];

interface GeoResult {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

async function fetchOpenMeteoGeocode(q: string): Promise<GeoResult[]> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((r: Record<string, unknown>) => ({
      name: (r.name as string) || '',
      country: (r.country_code as string) || (r.country as string) || '',
      state: (r.admin1 as string) || undefined,
      lat: r.latitude as number,
      lon: r.longitude as number,
    }));
  } catch {
    return [];
  }
}

function searchFallbackCities(q: string): GeoResult[] {
  const lower = q.toLowerCase();
  return CITIES.filter(c =>
    c.name.toLowerCase().includes(lower) ||
    c.country.toLowerCase().includes(lower)
  );
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const rawQ = searchParams.get('q') || '';
  const q = sanitizeQuery(rawQ);

  if (q.length < 2) {
    // Return popular cities if no query
    return NextResponse.json(CITIES.slice(0, 8), {
      headers: {
        'Cache-Control': 'public, s-maxage=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  // Try Open-Meteo geocoding first (free, real-time)
  const realResults = await fetchOpenMeteoGeocode(q);
  if (realResults.length > 0) {
    return NextResponse.json(realResults, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  // Fallback to local search if API fails
  const results = searchFallbackCities(q);
  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
