// SkyGuard Native Widget Bridge
// Updates the Android home screen widget with current weather data

import { registerPlugin } from '@capacitor/core';
import type { WeatherData } from '@/lib/weather-types';

interface WeatherWidgetPlugin {
  updateWidget(options: {
    location: string;
    temp: string;
    tempUnit: string;
    condition: string;
    aqi: number;
    aqiLevel: string;
    humidity: string;
    wind: string;
  }): Promise<{ success: boolean }>;
}

// Register the native plugin (only works when running in Capacitor)
const WeatherWidget = registerPlugin<WeatherWidgetPlugin>('WeatherWidget');

/**
 * Update the native Android home screen widget with current weather data.
 * This is a no-op when not running in a Capacitor native shell.
 */
export async function updateNativeWidget(data: WeatherData, useCelsius: boolean): Promise<void> {
  try {
    const temp = useCelsius
      ? Math.round(data.current.temp)
      : Math.round(data.current.temp * 9 / 5 + 32);
    const tempUnit = useCelsius ? '°C' : '°F';

    await WeatherWidget.updateWidget({
      location: data.location.name,
      temp: String(temp),
      tempUnit,
      condition: data.current.condition,
      aqi: data.airQuality.unavailable ? -1 : data.airQuality.aqi,
      aqiLevel: data.airQuality.level,
      humidity: String(data.current.humidity),
      wind: String(data.current.windSpeed),
    });
  } catch {
    // Not running in Capacitor native shell — silently ignore
  }
}

/**
 * Check if the app is running inside a Capacitor native shell.
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { Capacitor?: unknown }).Capacitor?.isNativePlatform?.();
}
