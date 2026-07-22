// ============================================================
// SkyGuard Weather App - Core Type Definitions
// ============================================================

export type WidgetStyle = 'classic' | 'compact' | 'gauge' | 'minimal' | 'glass' | 'timeline';

export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'thunderstorm'
  | 'snow'
  | 'fog'
  | 'windy'
  | 'drizzle';

export type AQILevel = 'good' | 'moderate' | 'unhealthy-sensitive' | 'unhealthy' | 'very-unhealthy' | 'hazardous' | 'very-hazardous';

export interface GeoLocation {
  lat: number;
  lon: number;
  name: string;
  country: string;
  state?: string;
}

export interface CurrentWeather {
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  pressure: number;
  humidity: number;
  dewPoint: number;
  visibility: number;
  windSpeed: number;
  windDeg: number;
  windGust: number;
  clouds: number;
  condition: WeatherCondition;
  description: string;
  iconCode: string;
  sunrise: number;
  sunset: number;
  uvi: number;
}

export interface HourlyForecast {
  dt: number;
  temp: number;
  feelsLike: number;
  condition: WeatherCondition;
  description: string;
  iconCode: string;
  pop: number; // probability of precipitation
  humidity: number;
  windSpeed: number;
  uvi: number;
}

export interface DailyForecast {
  dt: number;
  tempMin: number;
  tempMax: number;
  condition: WeatherCondition;
  description: string;
  iconCode: string;
  pop: number;
  humidity: number;
  windSpeed: number;
  uvi: number;
  sunrise: number;
  sunset: number;
}

export type AQISource = 'open-meteo' | 'waqi' | 'none';

export interface AirQualityData {
  aqi: number; // 0-500, -1 if unavailable
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  nh3: number;
  level: AQILevel;
  mainPollutant: string;
  healthAdvice: string;
  color: string;
  source: AQISource; // Where the data came from
  unavailable: boolean; // True if all AQI sources failed
}

export interface WeatherData {
  location: GeoLocation;
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  airQuality: AirQualityData;
  timezone: string;
  timezoneOffset: number;
  fetchedAt?: number; // Timestamp when data was fetched (for live tracking)
}

export interface WeatherSearchParams {
  lat?: number;
  lon?: number;
  q?: string; // city name search
}

// AQI utility functions
// US EPA AQI scale: 0-500
// 0-50: Good | 51-100: Moderate | 101-150: Unhealthy for Sensitive Groups
// 151-200: Unhealthy | 201-300: Very Unhealthy | 301-400: Hazardous | 401-500: Very Hazardous
export function getAQILevel(aqi: number): AQILevel {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy-sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very-unhealthy';
  if (aqi <= 400) return 'hazardous';
  return 'very-hazardous'; // 401-500
}

export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#22c55e';      // green
  if (aqi <= 100) return '#eab308';     // yellow
  if (aqi <= 150) return '#f97316';     // orange
  if (aqi <= 200) return '#ef4444';     // red
  if (aqi <= 300) return '#a855f7';     // purple
  if (aqi <= 400) return '#991b1b';     // maroon
  return '#7f1d1d';                      // dark maroon (401-500)
}

export function getAQIHealthAdvice(aqi: number): string {
  if (aqi <= 50) return 'Air quality is satisfactory. Enjoy outdoor activities!';
  if (aqi <= 100) return 'Acceptable air quality. Sensitive individuals should limit prolonged outdoor exertion.';
  if (aqi <= 150) return 'Sensitive groups may experience health effects. General public is less likely to be affected.';
  if (aqi <= 200) return 'Everyone may begin to experience health effects. Sensitive groups may experience more serious effects.';
  if (aqi <= 300) return 'Health alert: The risk of health effects is increased for everyone. Avoid outdoor activities.';
  if (aqi <= 400) return 'Health warning of emergency conditions. Everyone is likely to be affected. Stay indoors!';
  return 'Severe health warning: Emergency conditions. Remain indoors, keep windows closed, and use air purifiers if available.'; // 401-500
}

export function getWeatherConditionFromCode(code: number): WeatherCondition {
  if (code >= 200 && code < 300) return 'thunderstorm';
  if (code >= 300 && code < 400) return 'drizzle';
  if (code >= 500 && code < 600) return 'rain';
  if (code >= 600 && code < 700) return 'snow';
  if (code >= 700 && code < 800) return 'fog';
  if (code === 800) return 'clear';
  if (code === 801 || code === 802) return 'partly-cloudy';
  if (code >= 803) return 'cloudy';
  return 'clear';
}

export function getWindDirection(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

export function formatTime(timestamp: number, timezoneName: string): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezoneName,
  });
}

export function formatDay(timestamp: number, timezoneName: string = 'UTC'): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();

  // Compare dates in the location's timezone
  const dateStr = date.toLocaleDateString('en-US', { timeZone: timezoneName });
  const todayStr = now.toLocaleDateString('en-US', { timeZone: timezoneName });
  const tomorrowDate = new Date(now.getTime() + 86400000);
  const tomorrowStr = tomorrowDate.toLocaleDateString('en-US', { timeZone: timezoneName });

  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: timezoneName });
}
