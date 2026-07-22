import { NextRequest, NextResponse } from 'next/server';
import {
  type AirQualityData,
  getAQILevel,
  getAQIColor,
  getAQIHealthAdvice,
} from '@/lib/weather-types';

// ============================================================
// SkyGuard Air Quality API - Dedicated Live AQI Endpoint
// Fetches real-time AQI from multiple sources with fallback.
// Called independently for faster AQI refreshes without
// re-fetching the full weather data.
//
// Sources (priority order):
//   1. Open-Meteo Air Quality API (free, no key)
//   2. WAQI World Air Quality Index (real-time station data)
//   3. Unavailable state (NEVER dummy data)
// ============================================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 60; // Higher limit for AQI-only polling

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

// ---- Fetch with timeout and retry ----
async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
  retries: number = 3
): Promise<Response> {
  const { timeoutMs = 8000, ...fetchOpts } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...fetchOpts,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      const isLastAttempt = attempt === retries;
      if (isLastAttempt) throw err;

      const delay = attempt * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('All retries exhausted');
}

// ---- AQI sub-index → approximate raw concentration conversions ----
function aqiToPm25(aqi: number): number {
  if (aqi <= 50) return aqi * 0.7;
  if (aqi <= 100) return 35 + (aqi - 50) * 0.78;
  if (aqi <= 150) return 55.4 + (aqi - 100) * 3.04;
  if (aqi <= 200) return 150.4 + (aqi - 150) * 3.92;
  if (aqi <= 300) return 250.4 + (aqi - 200) * 3.46;
  return 500.4 + (aqi - 300) * 5.0;
}

function aqiToPm10(aqi: number): number {
  if (aqi <= 50) return aqi * 3;
  if (aqi <= 100) return 150 + (aqi - 50) * 1.0;
  if (aqi <= 150) return 254 + (aqi - 100) * 1.08;
  if (aqi <= 200) return 354 + (aqi - 150) * 1.26;
  if (aqi <= 300) return 424 + (aqi - 200) * 0.76;
  return 504 + (aqi - 300) * 3.0;
}

function aqiToO3(aqi: number): number {
  if (aqi <= 50) return aqi * 2.64;
  if (aqi <= 100) return 125 + (aqi - 50) * 3.28;
  if (aqi <= 150) return 165 + (aqi - 100) * 1.3;
  if (aqi <= 200) return 205 + (aqi - 150) * 1.96;
  return 404 + (aqi - 200) * 2.0;
}

function aqiToNo2(aqi: number): number {
  if (aqi <= 50) return aqi * 2.0;
  if (aqi <= 100) return 100 + (aqi - 50) * 3.6;
  if (aqi <= 150) return 360 + (aqi - 100) * 2.8;
  if (aqi <= 200) return 649 + (aqi - 150) * 2.42;
  return 1249 + (aqi - 200) * 3.0;
}

function aqiToSo2(aqi: number): number {
  if (aqi <= 50) return aqi * 0.7;
  if (aqi <= 100) return 35 + (aqi - 50) * 1.5;
  if (aqi <= 150) return 75 + (aqi - 100) * 3.7;
  if (aqi <= 200) return 185 + (aqi - 150) * 3.0;
  return 304 + (aqi - 200) * 4.0;
}

function aqiToCo(aqi: number): number {
  if (aqi <= 50) return aqi * 8.8;
  if (aqi <= 100) return 4400 + (aqi - 50) * 17.6;
  if (aqi <= 150) return 9400 + (aqi - 100) * 24.4;
  if (aqi <= 200) return 12400 + (aqi - 150) * 30.4;
  return 15400 + (aqi - 200) * 40.0;
}

// ---- AQI Validation ----
// US EPA AQI scale is 0-500. Open-Meteo's model can return values > 500 for
// heavily polluted locations. We CAP at 500 rather than reject, because
// rejecting real data and falling back to WAQI demo token gives worse results.
function validateAqi(aqi: number): { valid: boolean; capped: number } {
  if (typeof aqi !== 'number' || isNaN(aqi)) {
    return { valid: false, capped: 0 };
  }
  if (aqi < 0) {
    return { valid: false, capped: 0 };
  }
  if (aqi > 500) {
    console.log(`[AQI API] Capping AQI ${Math.round(aqi)} at 500 (exceeds EPA scale but is real data)`);
    return { valid: true, capped: 500 };
  }
  return { valid: true, capped: Math.round(aqi) };
}

// ---- Build AirQualityData from Open-Meteo AQ response ----
function buildAqFromOpenMeteo(aqCurrent: Record<string, unknown>): AirQualityData {
  const rawUsAqi = typeof aqCurrent.us_aqi === 'number' ? aqCurrent.us_aqi : 0;
  // Cap AQI at 500 and floor at 0 to stay within the US EPA scale
  const usAqi = Math.min(500, Math.max(0, Math.round(rawUsAqi)));
  const pm25 = typeof aqCurrent.pm2_5 === 'number' ? aqCurrent.pm2_5 : 0;
  const pm10 = typeof aqCurrent.pm10 === 'number' ? aqCurrent.pm10 : 0;
  const o3 = typeof aqCurrent.ozone === 'number' ? aqCurrent.ozone : 0;
  const no2 = typeof aqCurrent.nitrogen_dioxide === 'number' ? aqCurrent.nitrogen_dioxide : 0;
  const so2 = typeof aqCurrent.sulphur_dioxide === 'number' ? aqCurrent.sulphur_dioxide : 0;
  const co = typeof aqCurrent.carbon_monoxide === 'number' ? aqCurrent.carbon_monoxide : 0;
  const nh3 = typeof aqCurrent.ammonia === 'number' ? aqCurrent.ammonia : 0;

  const pollutants = [
    { name: 'PM2.5', value: pm25 },
    { name: 'PM10', value: pm10 },
    { name: 'O₃', value: o3 },
    { name: 'NO₂', value: no2 },
    { name: 'SO₂', value: so2 },
  ];
  const mainPollutant = pollutants.reduce((max, p) => (p.value > max.value ? p : max), pollutants[0]).name;
  const aqiRounded = usAqi; // already rounded and clamped above

  return {
    aqi: aqiRounded,
    pm25: Math.round(pm25 * 10) / 10,
    pm10: Math.round(pm10 * 10) / 10,
    o3: Math.round(o3 * 10) / 10,
    no2: Math.round(no2 * 10) / 10,
    so2: Math.round(so2 * 10) / 10,
    co: Math.round(co * 10) / 10,
    nh3: nh3 !== null ? Math.round(nh3 * 10) / 10 : 0,
    level: getAQILevel(aqiRounded),
    mainPollutant,
    healthAdvice: getAQIHealthAdvice(aqiRounded),
    color: getAQIColor(aqiRounded),
    source: 'open-meteo',
    unavailable: false,
  };
}

// ---- Fetch AQI from WAQI as fallback ----
async function fetchAqiFromWAQI(lat: number, lon: number): Promise<AirQualityData | null> {
  try {
    const response = await fetchWithRetry(
      `https://api.waqi.info/feed/here/?lat=${lat}&lng=${lon}&token=demo`,
      { timeoutMs: 6000, next: { revalidate: 0 } },
      2
    );

    if (!response.ok) {
      console.warn(`[AQI API] WAQI returned status ${response.status}`);
      return null;
    }

    const json = await response.json();

    // WAQI demo token may return rate-limit or error responses
    if (json.status === 'error') {
      console.warn('[AQI API] WAQI error:', json.data || json.message || 'unknown error');
      return null;
    }
    if (json.status !== 'ok' || !json.data) {
      console.warn('[AQI API] WAQI unexpected response:', json.status);
      return null;
    }

    const data = json.data;
    const rawAqi = typeof data.aqi === 'number' ? data.aqi : -1;
    if (rawAqi < 0) {
      console.warn('[AQI API] WAQI invalid AQI:', rawAqi);
      return null;
    }

    // Validate and cap WAQI AQI at 500 as well
    const validation = validateAqi(rawAqi);
    const aqi = validation.capped; // Always use capped value

    const iaqi = data.iaqi || {};

    const pm25Raw = aqiToPm25(iaqi.pm25?.v ?? 0);
    const pm10Raw = aqiToPm10(iaqi.pm10?.v ?? 0);
    const o3Raw = aqiToO3(iaqi.o3?.v ?? 0);
    const no2Raw = aqiToNo2(iaqi.no2?.v ?? 0);
    const so2Raw = aqiToSo2(iaqi.so2?.v ?? 0);
    const coRaw = aqiToCo(iaqi.co?.v ?? 0);

    const pollutants = [
      { name: 'PM2.5', value: pm25Raw },
      { name: 'PM10', value: pm10Raw },
      { name: 'O₃', value: o3Raw },
      { name: 'NO₂', value: no2Raw },
      { name: 'SO₂', value: so2Raw },
    ];
    const mainPollutant = data.dominentpol
      ? data.dominentpol === 'pm25' ? 'PM2.5' :
        data.dominentpol === 'pm10' ? 'PM10' :
        data.dominentpol === 'o3' ? 'O₃' :
        data.dominentpol === 'no2' ? 'NO₂' :
        data.dominentpol === 'so2' ? 'SO₂' :
        data.dominentpol.toUpperCase()
      : pollutants.reduce((max, p) => (p.value > max.value ? p : max), pollutants[0]).name;

    const aqiRounded = aqi; // already validated, rounded, and capped

    return {
      aqi: aqiRounded,
      pm25: Math.round(pm25Raw * 10) / 10,
      pm10: Math.round(pm10Raw * 10) / 10,
      o3: Math.round(o3Raw * 10) / 10,
      no2: Math.round(no2Raw * 10) / 10,
      so2: Math.round(so2Raw * 10) / 10,
      co: Math.round(coRaw * 10) / 10,
      nh3: 0,
      level: getAQILevel(aqiRounded),
      mainPollutant,
      healthAdvice: getAQIHealthAdvice(aqiRounded),
      color: getAQIColor(aqiRounded),
      source: 'waqi',
      unavailable: false,
    };
  } catch (err) {
    console.warn('[AQI API] WAQI fetch error:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ---- Main AQI fetch with multi-source fallback ----
async function fetchRealTimeAQI(lat: number, lon: number): Promise<AirQualityData> {
  // Source 1: Open-Meteo Air Quality API (primary — most reliable)
  try {
    const aqResponse = await fetchWithRetry(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,ammonia,us_aqi`,
      { timeoutMs: 10000, next: { revalidate: 0 } },
      3
    );

    if (aqResponse.ok) {
      const aqJson = await aqResponse.json();
      if (aqJson?.current && typeof aqJson.current.us_aqi === 'number') {
        const rawAqi = aqJson.current.us_aqi as number;
        const validation = validateAqi(rawAqi);

        if (validation.valid) {
          console.log(`[AQI API] Open-Meteo: ${rawAqi} (capped: ${validation.capped}) for ${lat},${lon}`);
          return buildAqFromOpenMeteo(aqJson.current);
        }
        console.warn(`[AQI API] Open-Meteo AQI ${rawAqi} is invalid, trying WAQI fallback`);
      }
    }
    console.warn('[AQI API] Open-Meteo failed or returned no data, trying WAQI...');
  } catch (err) {
    console.warn('[AQI API] Open-Meteo error:', err instanceof Error ? err.message : err);
  }

  // Source 2: WAQI (fallback)
  const waqiResult = await fetchAqiFromWAQI(lat, lon);
  if (waqiResult) {
    console.log(`[AQI API] WAQI: ${waqiResult.aqi} for ${lat},${lon}`);
    return waqiResult;
  }

  // All sources failed
  console.error(`[AQI API] All sources failed for ${lat},${lon}`);
  return {
    aqi: -1,
    pm25: -1,
    pm10: -1,
    o3: -1,
    no2: -1,
    so2: -1,
    co: -1,
    nh3: -1,
    level: 'good',
    mainPollutant: 'N/A',
    healthAdvice: 'Air quality data is currently unavailable. Please try refreshing in a few moments.',
    color: '#6b7280',
    source: 'none',
    unavailable: true,
  };
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');

  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Invalid coordinates.' }, { status: 400 });
  }

  try {
    const airQuality = await fetchRealTimeAQI(lat, lon);

    return NextResponse.json(airQuality, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Data-Source': airQuality.source === 'waqi' ? 'WAQI' : airQuality.source === 'open-meteo' ? 'Open-Meteo' : 'None',
        'X-Data-Freshness': new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch air quality data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
