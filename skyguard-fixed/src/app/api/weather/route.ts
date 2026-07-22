import { NextRequest, NextResponse } from 'next/server';
import {
  type WeatherData,
  type CurrentWeather,
  type HourlyForecast,
  type DailyForecast,
  type AirQualityData,
  type GeoLocation,
  type WeatherCondition,
  getAQILevel,
  getAQIColor,
  getAQIHealthAdvice,
} from '@/lib/weather-types';

// ============================================================
// SkyGuard Weather API - Real-Time via Open-Meteo (Free, No Key)
// Open-Meteo provides accurate, live weather and AQI data
// without requiring any API key.
//
// AQI Data Sources (in priority order):
//   1. Open-Meteo Air Quality API (primary - free, no key)
//   2. WAQI World Air Quality Index (fallback - real-time station data)
//
// NEVER returns dummy/fake AQI data. If all sources fail,
// airQuality.unavailable will be true.
// ============================================================

// Rate limiting via in-memory store
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;

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

function isValidCoord(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180
  );
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

      // Exponential backoff: 500ms, 1000ms
      const delay = attempt * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('All retries exhausted');
}

// WMO Weather Code → WeatherCondition mapping
function getConditionFromWMOCode(code: number, _isDay: boolean = true): WeatherCondition {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly-cloudy';
  if (code <= 49) return 'fog';
  if (code <= 59) return 'drizzle';
  if (code <= 69) return 'rain';
  if (code <= 79) return 'snow';
  if (code <= 84) return 'rain';
  if (code <= 86) return 'snow';
  if (code <= 99) return 'thunderstorm';
  return 'partly-cloudy';
}

function getDescriptionFromWMOCode(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'clear sky',
    1: 'mainly clear',
    2: 'partly cloudy',
    3: 'overcast',
    45: 'foggy',
    48: 'depositing rime fog',
    51: 'light drizzle',
    53: 'moderate drizzle',
    55: 'dense drizzle',
    56: 'light freezing drizzle',
    57: 'dense freezing drizzle',
    61: 'slight rain',
    63: 'moderate rain',
    65: 'heavy rain',
    66: 'light freezing rain',
    67: 'heavy freezing rain',
    71: 'slight snowfall',
    73: 'moderate snowfall',
    75: 'heavy snowfall',
    77: 'snow grains',
    80: 'slight rain showers',
    81: 'moderate rain showers',
    82: 'violent rain showers',
    85: 'slight snow showers',
    86: 'heavy snow showers',
    95: 'thunderstorm',
    96: 'thunderstorm with slight hail',
    99: 'thunderstorm with heavy hail',
  };
  return descriptions[code] || 'partly cloudy';
}

function getIconFromWMOCode(code: number, isDay: boolean): string {
  const dayNight = isDay ? 'd' : 'n';
  if (code === 0) return `01${dayNight}`;
  if (code <= 3) return `02${dayNight}`;
  if (code <= 49) return `50${dayNight}`;
  if (code <= 59) return `09${dayNight}`;
  if (code <= 69) return `10${dayNight}`;
  if (code <= 79) return `13${dayNight}`;
  if (code <= 84) return `10${dayNight}`;
  if (code <= 86) return `13${dayNight}`;
  if (code <= 99) return `11${dayNight}`;
  return `02${dayNight}`;
}

// ---- AQI Validation ----
// US EPA AQI scale is 0-500. Values outside this range are likely model errors.
function validateAqi(aqi: number): { valid: boolean; capped: number } {
  if (typeof aqi !== 'number' || isNaN(aqi)) {
    return { valid: false, capped: 0 };
  }
  if (aqi < 0) {
    return { valid: false, capped: 0 };
  }
  if (aqi > 500) {
    return { valid: false, capped: 500 };
  }
  return { valid: true, capped: Math.round(aqi) };
}

// Maximum acceptable staleness for AQI data (2 hours in seconds)
const AQI_STALE_THRESHOLD_SECONDS = 2 * 60 * 60;

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

// ---- Fetch AQI from WAQI (World Air Quality Index) as fallback ----
// WAQI provides real-time data from monitoring stations worldwide.
// The demo token has limitations but works for many locations.
async function fetchAqiFromWAQI(lat: number, lon: number): Promise<AirQualityData | null> {
  try {
    const response = await fetchWithRetry(
      `https://api.waqi.info/feed/here/?lat=${lat}&lng=${lon}&token=demo`,
      { timeoutMs: 6000, next: { revalidate: 0 } },
      2
    );

    if (!response.ok) {
      console.warn(`[AQI] WAQI returned status ${response.status}`);
      return null;
    }

    const json = await response.json();

    // WAQI demo token may return rate-limit or error responses
    if (json.status === 'error') {
      console.warn('[AQI] WAQI error:', json.data || json.message || 'unknown error');
      return null;
    }
    if (json.status !== 'ok' || !json.data) {
      console.warn('[AQI] WAQI unexpected response:', json.status);
      return null;
    }

    const data = json.data;
    const rawAqi = typeof data.aqi === 'number' ? data.aqi : -1;
    if (rawAqi < 0) {
      console.warn('[AQI] WAQI invalid AQI:', rawAqi);
      return null;
    }

    // Validate and cap WAQI AQI at 500 as well
    const validation = validateAqi(rawAqi);
    const aqi = validation.valid ? validation.capped : Math.min(500, validation.capped);

    const iaqi = data.iaqi || {};

    // WAQI returns AQI values in their index format
    // iaqi values are sub-indices (not raw concentrations)
    // We need to convert back to approximate raw values
    const pm25Iaqi = iaqi.pm25?.v ?? 0;
    const pm10Iaqi = iaqi.pm10?.v ?? 0;
    const o3Iaqi = iaqi.o3?.v ?? 0;
    const no2Iaqi = iaqi.no2?.v ?? 0;
    const so2Iaqi = iaqi.so2?.v ?? 0;
    const coIaqi = iaqi.co?.v ?? 0;

    // Convert AQI sub-indices to approximate raw concentrations
    // These are rough conversions based on US EPA breakpoints
    const pm25Raw = aqiToPm25(pm25Iaqi);
    const pm10Raw = aqiToPm10(pm10Iaqi);
    const o3Raw = aqiToO3(o3Iaqi);
    const no2Raw = aqiToNo2(no2Iaqi);
    const so2Raw = aqiToSo2(so2Iaqi);
    const coRaw = aqiToCo(coIaqi);

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
    console.warn('[AQI] WAQI fetch error:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ---- Approximate AQI sub-index → raw concentration conversions ----
// Based on US EPA AQI breakpoints
function aqiToPm25(aqi: number): number {
  if (aqi <= 50) return aqi * 0.7;    // 0-35 µg/m³
  if (aqi <= 100) return 35 + (aqi - 50) * 0.78; // 35-55.4
  if (aqi <= 150) return 55.4 + (aqi - 100) * 3.04; // 55.4-150.4
  if (aqi <= 200) return 150.4 + (aqi - 150) * 3.92; // 150.4-250.4
  if (aqi <= 300) return 250.4 + (aqi - 200) * 3.46; // 250.4-500.4
  return 500.4 + (aqi - 300) * 5.0;
}

function aqiToPm10(aqi: number): number {
  if (aqi <= 50) return aqi * 3;       // 0-150 µg/m³
  if (aqi <= 100) return 150 + (aqi - 50) * 1.0; // 150-254
  if (aqi <= 150) return 254 + (aqi - 100) * 1.08; // 254-354
  if (aqi <= 200) return 354 + (aqi - 150) * 1.26; // 354-424
  if (aqi <= 300) return 424 + (aqi - 200) * 0.76; // 424-504
  return 504 + (aqi - 300) * 3.0;
}

function aqiToO3(aqi: number): number {
  if (aqi <= 50) return aqi * 2.64;    // 0-125 µg/m³
  if (aqi <= 100) return 125 + (aqi - 50) * 3.28; // 125-165
  if (aqi <= 150) return 165 + (aqi - 100) * 1.3; // 165-205
  if (aqi <= 200) return 205 + (aqi - 150) * 1.96; // 205-404
  return 404 + (aqi - 200) * 2.0;
}

function aqiToNo2(aqi: number): number {
  if (aqi <= 50) return aqi * 2.0;     // 0-100 µg/m³
  if (aqi <= 100) return 100 + (aqi - 50) * 3.6; // 100-360
  if (aqi <= 150) return 360 + (aqi - 100) * 2.8; // 360-649
  if (aqi <= 200) return 649 + (aqi - 150) * 2.42; // 649-1249
  return 1249 + (aqi - 200) * 3.0;
}

function aqiToSo2(aqi: number): number {
  if (aqi <= 50) return aqi * 0.7;     // 0-35 µg/m³
  if (aqi <= 100) return 35 + (aqi - 50) * 1.5; // 35-75
  if (aqi <= 150) return 75 + (aqi - 100) * 3.7; // 75-185
  if (aqi <= 200) return 185 + (aqi - 150) * 3.0; // 185-304
  return 304 + (aqi - 200) * 4.0;
}

function aqiToCo(aqi: number): number {
  if (aqi <= 50) return aqi * 8.8;     // 0-4400 µg/m³
  if (aqi <= 100) return 4400 + (aqi - 50) * 17.6; // 4400-9400
  if (aqi <= 150) return 9400 + (aqi - 100) * 24.4; // 9400-12400
  if (aqi <= 200) return 12400 + (aqi - 150) * 30.4; // 12400-15400
  return 15400 + (aqi - 200) * 40.0;
}

// ---- Fetch real-time AQI data with multi-source fallback ----
async function fetchRealTimeAQI(lat: number, lon: number): Promise<AirQualityData> {
  // Source 1: Open-Meteo Air Quality API (primary)
  try {
    const aqResponse = await fetchWithRetry(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,ammonia,us_aqi`,
      { timeoutMs: 10000, next: { revalidate: 0 } },
      3 // 3 retries
    );

    if (aqResponse.ok) {
      const aqJson = await aqResponse.json();
      if (aqJson?.current && typeof aqJson.current.us_aqi === 'number') {
        const rawAqi = aqJson.current.us_aqi as number;
        const validation = validateAqi(rawAqi);

        // Data freshness check: if the current timestamp is too old, skip
        const aqCurrentTime = aqJson.current.time;
        let isStale = false;
        if (typeof aqCurrentTime === 'string') {
          try {
            const dataTime = new Date(aqCurrentTime).getTime();
            const nowMs = Date.now();
            const ageSeconds = (nowMs - dataTime) / 1000;
            if (ageSeconds > AQI_STALE_THRESHOLD_SECONDS) {
              isStale = true;
              console.warn(`[AQI] Open-Meteo data stale (age: ${Math.round(ageSeconds / 60)} min), falling back to WAQI`);
            }
          } catch {
            // If we can't parse the timestamp, don't treat as stale
          }
        }

        if (validation.valid && !isStale) {
          console.log(`[AQI] Open-Meteo AQI for ${lat},${lon}: ${rawAqi}`);
          return buildAqFromOpenMeteo(aqJson.current);
        } else if (!validation.valid) {
          console.warn(`[AQI] Open-Meteo AQI ${rawAqi} outside valid range (0-500), falling back to WAQI`);
        }
        // If invalid or stale, fall through to WAQI
      }
    }
    console.warn('[AQI] Open-Meteo AQ API failed or returned invalid data, trying WAQI fallback...');
  } catch (err) {
    console.warn('[AQI] Open-Meteo AQ API error:', err instanceof Error ? err.message : err);
  }

  // Source 2: WAQI World Air Quality Index (fallback - real-time station data)
  const waqiResult = await fetchAqiFromWAQI(lat, lon);
  if (waqiResult) {
    console.log(`[AQI] WAQI AQI for ${lat},${lon}: ${waqiResult.aqi}`);
    return waqiResult;
  }

  // All sources failed - return unavailable state (NEVER return dummy data)
  console.error(`[AQI] All AQI sources failed for ${lat},${lon}`);
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

// ---- Real API fetch (Open-Meteo - Free, No Key Required) ----
async function fetchRealWeather(lat: number, lon: number): Promise<WeatherData> {
  const nowSeconds = Math.floor(Date.now() / 1000);

  // Fetch weather + air quality in parallel
  const [weatherResult, airQuality] = await Promise.allSettled([
    fetchWithRetry(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,pressure_msl,cloud_cover,dew_point_2m,visibility,is_day,uv_index` +
      `&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,uv_index,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset` +
      `&wind_speed_unit=ms&timezone=auto&forecast_days=7`,
      { timeoutMs: 10000, next: { revalidate: 0 } },
      3
    ),
    fetchRealTimeAQI(lat, lon),
  ]);

  if (weatherResult.status === 'rejected') {
    throw new Error(`Weather API fetch failed: ${weatherResult.reason}`);
  }

  const weatherRes = weatherResult.value;
  if (!weatherRes.ok) {
    throw new Error(`Weather API error: ${weatherRes.status}`);
  }

  const weatherJson = await weatherRes.json();

  const currentData = weatherJson.current;
  const hourlyData = weatherJson.hourly;
  const dailyData = weatherJson.daily;
  const isDay = currentData.is_day === 1;
  const wmoCode = currentData.weather_code;

  // Resolve location name from timezone
  const timezoneName = weatherJson.timezone || 'UTC';
  const utcOffsetSeconds: number = weatherJson.utc_offset_seconds || 0;
  const locationName = timezoneName.split('/').pop()?.replace(/_/g, ' ') || 'Your Location';

  const location: GeoLocation = {
    lat,
    lon,
    name: locationName,
    country: '',
  };

  // ---- Convert local-time ISO strings to correct UTC Unix timestamps ----
  // Open-Meteo returns times like "2026-05-11T05:33" in the location's local
  // timezone (because we pass timezone=auto). We must append the UTC offset
  // so JavaScript parses them into the correct UTC instant.
  function localIsoToUtcTs(isoStr: string | undefined, fallbackOffset: number): number {
    if (!isoStr) return nowSeconds + fallbackOffset;
    // Build offset string from utc_offset_seconds (e.g. +05:30, -04:00)
    const totalMin = Math.round(utcOffsetSeconds / 60);
    const sign = totalMin >= 0 ? '+' : '-';
    const absMin = Math.abs(totalMin);
    const h = String(Math.floor(absMin / 60)).padStart(2, '0');
    const m = String(absMin % 60).padStart(2, '0');
    const offsetStr = `${sign}${h}:${m}`;
    // Date-only strings like "2026-05-11" need T00:00 inserted before the offset.
    // Datetime strings like "2026-05-11T05:33" already have the T.
    const separator = isoStr.includes('T') ? '' : 'T00:00:00';
    return Math.floor(new Date(`${isoStr}${separator}${offsetStr}`).getTime() / 1000);
  }

  const sunriseTs = localIsoToUtcTs(dailyData.sunrise?.[0], -6 * 3600);
  const sunsetTs  = localIsoToUtcTs(dailyData.sunset?.[0],  6 * 3600);

  const current: CurrentWeather = {
    temp: Math.round(currentData.temperature_2m),
    feelsLike: Math.round(currentData.apparent_temperature),
    tempMin: Math.round(dailyData.temperature_2m_min?.[0] ?? currentData.temperature_2m),
    tempMax: Math.round(dailyData.temperature_2m_max?.[0] ?? currentData.temperature_2m),
    pressure: Math.round(currentData.pressure_msl ?? currentData.surface_pressure),
    humidity: currentData.relative_humidity_2m,
    dewPoint: Math.round(currentData.dew_point_2m),
    visibility: Math.round(currentData.visibility || 10000),
    windSpeed: Math.round((currentData.wind_speed_10m || 0) * 10) / 10,
    windDeg: currentData.wind_direction_10m || 0,
    windGust: Math.round((currentData.wind_gusts_10m || 0) * 10) / 10,
    clouds: currentData.cloud_cover || 0,
    condition: getConditionFromWMOCode(wmoCode, isDay),
    description: getDescriptionFromWMOCode(wmoCode),
    iconCode: getIconFromWMOCode(wmoCode, isDay),
    sunrise: sunriseTs,
    sunset: sunsetTs,
    uvi: Math.round((currentData.uv_index || 0) * 10) / 10,
  };

  // Build hourly forecast (next 48 hours)
  const hourly: HourlyForecast[] = (hourlyData.time || []).slice(0, 48).map((time: string, i: number) => {
    const hourIsDay = hourlyData.is_day?.[i] === 1;
    const hourWmo = hourlyData.weather_code?.[i] ?? 0;
    return {
      dt: localIsoToUtcTs(time, 0),
      temp: Math.round((hourlyData.temperature_2m?.[i] ?? 0) * 10) / 10,
      feelsLike: Math.round((hourlyData.apparent_temperature?.[i] ?? 0) * 10) / 10,
      condition: getConditionFromWMOCode(hourWmo, hourIsDay),
      description: getDescriptionFromWMOCode(hourWmo),
      iconCode: getIconFromWMOCode(hourWmo, hourIsDay),
      pop: (hourlyData.precipitation_probability?.[i] ?? 0) / 100,
      humidity: hourlyData.relative_humidity_2m?.[i] ?? 0,
      windSpeed: Math.round((hourlyData.wind_speed_10m?.[i] ?? 0) * 10) / 10,
      uvi: Math.round((hourlyData.uv_index?.[i] ?? 0) * 10) / 10,
    };
  });

  // Build daily forecast (7 days)
  const daily: DailyForecast[] = (dailyData.time || []).slice(0, 7).map((time: string, i: number) => {
    const dayWmo = dailyData.weather_code?.[i] ?? 0;
    const daySunriseStr = dailyData.sunrise?.[i];
    const daySunsetStr = dailyData.sunset?.[i];
    return {
      dt: localIsoToUtcTs(time, 0),
      tempMin: Math.round((dailyData.temperature_2m_min?.[i] ?? 0) * 10) / 10,
      tempMax: Math.round((dailyData.temperature_2m_max?.[i] ?? 0) * 10) / 10,
      condition: getConditionFromWMOCode(dayWmo, true),
      description: getDescriptionFromWMOCode(dayWmo),
      iconCode: getIconFromWMOCode(dayWmo, true),
      pop: (dailyData.precipitation_probability_max?.[i] ?? 0) / 100,
      humidity: 0,
      windSpeed: Math.round((dailyData.wind_speed_10m_max?.[i] ?? 0) * 10) / 10,
      uvi: Math.round((dailyData.uv_index_max?.[i] ?? 0) * 10) / 10,
      sunrise: localIsoToUtcTs(daySunriseStr, 0),
      sunset: localIsoToUtcTs(daySunsetStr, 0),
    };
  });

  // Use the AQI result (from multi-source fetch)
  const aqData = airQuality.status === 'fulfilled'
    ? airQuality.value
    : {
        aqi: -1, pm25: -1, pm10: -1, o3: -1, no2: -1, so2: -1, co: -1, nh3: -1,
        level: 'good' as const,
        mainPollutant: 'N/A',
        healthAdvice: 'Air quality data is currently unavailable.',
        color: '#6b7280',
        source: 'none' as const,
        unavailable: true,
      };

  return {
    location,
    current,
    hourly,
    daily,
    airQuality: aqData as AirQualityData,
    timezone: weatherJson.timezone || 'UTC',
    timezoneOffset: weatherJson.utc_offset_seconds || 0,
    fetchedAt: Date.now(),
  };
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');

  if (!isValidCoord(lat, lon)) {
    return NextResponse.json({ error: 'Invalid coordinates.' }, { status: 400 });
  }

  try {
    const data = await fetchRealWeather(lat, lon);

    return NextResponse.json(data, {
      headers: {
        // No CDN caching - always live data
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Data-Source': data.airQuality.source === 'waqi' ? 'Open-Meteo + WAQI' : 'Open-Meteo',
        'X-Data-Freshness': new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch weather data';
    console.error('[Weather API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
