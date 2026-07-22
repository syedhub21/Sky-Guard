'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  LayoutGrid,
  ShieldCheck,
  Loader2,
  CloudOff,
  Clock,
  Droplets,
  Wind,
  Sunrise,
  Sunset,
  MapPin,
  CircleDot,
  Menu,
  X,
  Share2,
  Search,
} from 'lucide-react';
import { useWeatherStore } from '@/lib/weather-store';
import type { WeatherData, WidgetStyle, AirQualityData } from '@/lib/weather-types';
import { formatTime } from '@/lib/weather-types';
import { fetchWeatherClient, fetchAirQualityClient } from '@/lib/client-api';
import { updateNativeWidget } from '@/lib/native-widget';
import { AnimatedBackground } from '@/components/weather/animated-background';
import { CurrentWeatherCard } from '@/components/weather/current-weather-card';
import { HourlyForecastCard } from '@/components/weather/hourly-forecast';
import { DailyForecastCard } from '@/components/weather/daily-forecast';
import { WeatherIcon } from '@/components/weather/weather-icon';
import { TemperatureDisplay } from '@/components/weather/weather-utils';
import AqDetailCard from '@/components/air-quality/aq-detail-card';
import AqGauge from '@/components/air-quality/aq-gauge';
import { WidgetPicker } from '@/components/weather/widget-picker';
import { SearchBar } from '@/components/weather/search-bar';
import { SettingsPanel } from '@/components/weather/settings-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InstallPrompt } from '@/components/weather/install-prompt';
import { WeatherAlertsCard } from '@/components/weather/weather-alerts-card';
import { UvIndexCard } from '@/components/weather/uv-index-card';
import { ComfortCard } from '@/components/weather/comfort-card';

// Dynamic import — the globe uses Three.js which touches `window`, so it
// must never be server-rendered. ssr:false is allowed in client components.
const WeatherGlobe = dynamic(
  () => import('@/components/weather/weather-globe').then((m) => m.WeatherGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center" style={{ width: 320, height: 320 }}>
        <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
      </div>
    ),
  }
);

// ============================================================
// Auto-refresh intervals for live data
// ============================================================
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes for full weather
const AQI_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes for AQI only
const LIVE_THRESHOLD = 60 * 1000; // Data is "LIVE" if fetched within 60 seconds

// ============================================================
// Loading skeleton
// ============================================================
function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="relative">
          <Loader2 className="h-10 w-10 text-white/75 animate-spin" />
          <motion.div
            className="absolute inset-0 rounded-full bg-white/5"
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <p className="text-white/75 text-sm font-medium">Fetching live weather data...</p>
      </motion.div>
    </div>
  );
}

// ============================================================
// Error display
// ============================================================
function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4"
    >
      <CloudOff className="h-14 w-14 text-white/50" />
      <p className="text-white/80 text-center max-w-xs text-sm font-medium">{error}</p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="bg-white/15 border-white/25 text-white hover:bg-white/25 font-semibold"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </motion.div>
  );
}

// ============================================================
// Welcome screen (no location selected)
// ============================================================
function WelcomeScreen({ onLocationSelect, onUseMyLocation, isLocating }: {
  onLocationSelect: (lat: number, lon: number, name: string, country: string) => void;
  onUseMyLocation: () => void;
  isLocating: boolean;
}) {
  // Staggered entrance — each element floats in with its own timing
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 py-6"
    >
      {/* Title with subtle glow */}
      <motion.h1
        {...fadeUp(0.05)}
        className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-center"
        style={{ textShadow: '0 2px 20px rgba(255,255,255,0.25)' }}
      >
        SkyGuard
      </motion.h1>

      {/* Tagline */}
      <motion.p {...fadeUp(0.12)} className="text-white/80 text-center max-w-lg leading-relaxed text-sm sm:text-base">
        Tap a city on the globe to explore its weather — or search for any city.
      </motion.p>

      {/* Globe + Search side by side on desktop, stacked on mobile */}
      <motion.div
        {...fadeUp(0.2)}
        className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5 lg:gap-8 w-full max-w-4xl mt-2"
      >
        {/* Globe — left side on desktop */}
        <div className="flex-shrink-0 flex justify-center">
          <WeatherGlobe onSelect={onLocationSelect} />
        </div>

        {/* Search + location — right side on desktop, below globe on mobile */}
        <div className="flex flex-col gap-3 w-full max-w-md lg:pt-8">
          <SearchBar onSelect={onLocationSelect} />
          <Button
            variant="outline"
            size="sm"
            onClick={onUseMyLocation}
            disabled={isLocating}
            className="rounded-full border-white/25 bg-white/[0.08] text-white/90 hover:bg-white/15 hover:text-white hover:border-white/50 gap-2 h-10 px-6 backdrop-blur-md transition-all duration-300 shadow-lg self-start"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {isLocating ? 'Locating…' : 'Use my current location'}
          </Button>
        </div>
      </motion.div>

      {/* Footer attribution */}
      <motion.div
        {...fadeUp(0.4)}
        className="flex items-center gap-2 text-xs mt-2"
      >
        <ShieldCheck className="h-3 w-3 text-white/40" />
        <span className="text-white/45">Powered by Open-Meteo · Live data</span>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Live Data Indicator
// ============================================================
function LiveDataIndicator({ fetchedAt, onRefresh, isRefreshing, nextRefreshIn }: {
  fetchedAt: number | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  nextRefreshIn: number;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isLive = fetchedAt && (now - fetchedAt) < LIVE_THRESHOLD;
  const secondsAgo = fetchedAt ? Math.floor((now - fetchedAt) / 1000) : null;
  const nextRefreshSeconds = Math.max(0, Math.ceil(nextRefreshIn / 1000));
  const nextRefreshMinutes = Math.floor(nextRefreshSeconds / 60);
  const nextRefreshSecs = nextRefreshSeconds % 60;

  const formatAgo = (s: number): string => {
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return rs > 0 ? `${m}m ${rs}s ago` : `${m}m ago`;
  };

  return (
    <motion.div
      className="flex items-center justify-center gap-2 sm:gap-3 mt-4 flex-wrap px-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
    >
      {/* LIVE pulse indicator */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex items-center justify-center">
          <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75 animate-ping`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        </div>
        <span className={`text-[10px] sm:text-xs font-semibold ${isLive ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isLive ? 'LIVE' : 'UPDATED'}
        </span>
      </div>

      {/* Time ago */}
      {secondsAgo !== null && (
        <span className="text-white/50 text-[10px] sm:text-xs flex items-center gap-1">
          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          {formatAgo(secondsAgo)}
        </span>
      )}

      {/* Next refresh countdown */}
      {!isRefreshing && nextRefreshSeconds > 0 && (
        <span className="text-white/40 text-[10px] sm:text-xs hidden sm:inline">
          Next refresh in {nextRefreshMinutes > 0 ? `${nextRefreshMinutes}m ` : ''}{nextRefreshSecs}s
        </span>
      )}

      {/* Refreshing indicator */}
      {isRefreshing && (
        <span className="text-emerald-400/90 text-[10px] sm:text-xs flex items-center gap-1 font-medium">
          <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin" />
          Refreshing...
        </span>
      )}
    </motion.div>
  );
}

// ============================================================
// Widget style layout variants
// ============================================================

interface LayoutProps {
  data: WeatherData;
  useCelsius: boolean;
  onRefreshAqi?: () => void;
  isRefreshingAqi?: boolean;
}

function ClassicLayout({ data, useCelsius, onRefreshAqi, isRefreshingAqi }: LayoutProps) {
  const isDaytime = (() => {
    const now = Math.floor(Date.now() / 1000);
    return now > data.current.sunrise && now < data.current.sunset;
  })();

  return (
    <motion.div
      className="flex flex-col gap-3 sm:gap-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <CurrentWeatherCard
        weather={data.current}
        location={data.location}
        timezoneName={data.timezone}
        useCelsius={useCelsius}
      />
      <WeatherAlertsCard weather={data.current} airQuality={data.airQuality} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AqDetailCard airQuality={data.airQuality} onRefreshAqi={onRefreshAqi} isRefreshingAqi={isRefreshingAqi} />
        <UvIndexCard uvi={data.current.uvi} isDaytime={isDaytime} />
      </div>
      <ComfortCard weather={data.current} useCelsius={useCelsius} />
      <HourlyForecastCard
        hourly={data.hourly}
        timezoneName={data.timezone}
        useCelsius={useCelsius}
      />
      <DailyForecastCard
        daily={data.daily}
        timezoneName={data.timezone}
        useCelsius={useCelsius}
      />
    </motion.div>
  );
}

function CompactLayout({ data, useCelsius, onRefreshAqi, isRefreshingAqi }: LayoutProps) {
  const isDaytime = (() => {
    const now = Math.floor(Date.now() / 1000);
    return now > data.current.sunrise && now < data.current.sunset;
  })();

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Compact current weather + AQI side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CurrentWeatherCard
          weather={data.current}
          location={data.location}
          timezoneName={data.timezone}
          useCelsius={useCelsius}
        />
        <AqDetailCard airQuality={data.airQuality} onRefreshAqi={onRefreshAqi} isRefreshingAqi={isRefreshingAqi} />
      </div>
      <WeatherAlertsCard weather={data.current} airQuality={data.airQuality} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UvIndexCard uvi={data.current.uvi} isDaytime={isDaytime} />
        <ComfortCard weather={data.current} useCelsius={useCelsius} />
      </div>
      <HourlyForecastCard
        hourly={data.hourly}
        timezoneName={data.timezone}
        useCelsius={useCelsius}
      />
      <DailyForecastCard
        daily={data.daily}
        timezoneName={data.timezone}
        useCelsius={useCelsius}
      />
    </motion.div>
  );
}

function GaugeLayout({ data, useCelsius, onRefreshAqi, isRefreshingAqi }: LayoutProps) {
  const current = data.current;
  const aq = data.airQuality;
  const isDaytime = (() => {
    const now = Math.floor(Date.now() / 1000);
    return now > current.sunrise && now < current.sunset;
  })();

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Large AQI Gauge Centered */}
      <div className="skyguard-card skyguard-card-gradient skyguard-card-aqi flex flex-col items-center gap-3 p-4 sm:p-6 shadow-xl">
        {aq.unavailable ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CloudOff className="h-12 w-12 text-white/30" />
            <p className="text-white/70 font-semibold text-sm">AQI Data Unavailable</p>
            <p className="text-white/50 text-xs text-center">{aq.healthAdvice}</p>
            {onRefreshAqi && (
              <button
                onClick={onRefreshAqi}
                disabled={isRefreshingAqi}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/20 border border-white/20 text-white/80 text-xs font-medium transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingAqi ? 'animate-spin' : ''}`} />
                Retry
              </button>
            )}
          </div>
        ) : (
          <>
            <AqGauge aqi={aq.aqi} color={aq.color} size={180} />
            <div className="text-center">
              <p className="text-sm sm:text-lg font-bold text-white">
                Air Quality: <span style={{ color: aq.color }}>{aq.level.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </p>
              <p className="text-xs sm:text-sm text-white/70 mt-1">{aq.healthAdvice}</p>
            </div>
          </>
        )}
      </div>

      {/* Weather gauges row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="skyguard-card flex flex-col items-center gap-1.5 p-3 sm:p-4">
          <TemperatureDisplay value={current.temp} useCelsius={useCelsius} size="lg" />
          <span className="text-[10px] sm:text-xs text-white/65 font-semibold">Temperature</span>
        </div>
        <div className="skyguard-card flex flex-col items-center gap-1.5 p-3 sm:p-4">
          <span className="text-xl sm:text-2xl font-semibold text-white">{current.humidity}%</span>
          <span className="text-[10px] sm:text-xs text-white/65 font-semibold">Humidity</span>
        </div>
        <div className="skyguard-card flex flex-col items-center gap-1.5 p-3 sm:p-4">
          <span className="text-xl sm:text-2xl font-semibold text-white">{current.windSpeed}</span>
          <span className="text-[10px] sm:text-xs text-white/65 font-semibold">Wind m/s</span>
        </div>
      </div>

      <AqDetailCard airQuality={data.airQuality} onRefreshAqi={onRefreshAqi} isRefreshingAqi={isRefreshingAqi} />
      <WeatherAlertsCard weather={data.current} airQuality={data.airQuality} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UvIndexCard uvi={data.current.uvi} isDaytime={isDaytime} />
        <ComfortCard weather={data.current} useCelsius={useCelsius} />
      </div>
      <HourlyForecastCard hourly={data.hourly} timezoneName={data.timezone} useCelsius={useCelsius} />
      <DailyForecastCard daily={data.daily} timezoneName={data.timezone} useCelsius={useCelsius} />
    </motion.div>
  );
}

function MinimalLayout({ data, useCelsius, onRefreshAqi, isRefreshingAqi }: LayoutProps) {
  const current = data.current;
  const aq = data.airQuality;
  const isDaytime = (() => {
    const now = Math.floor(Date.now() / 1000);
    return now > current.sunrise && now < current.sunset;
  })();

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Minimal centered weather */}
      <div className="flex flex-col items-center gap-2 py-6 px-4">
        <WeatherIcon condition={current.condition} size={64} />
        <TemperatureDisplay value={current.temp} useCelsius={useCelsius} size="xl" />
        <p className="text-white/80 capitalize text-sm font-medium">{current.description}</p>
        <div className="flex items-center gap-3 text-xs text-white/65">
          <span>H: <TemperatureDisplay value={current.tempMax} useCelsius={useCelsius} size="sm" showUnit={false} animate={false} /></span>
          <span>L: <TemperatureDisplay value={current.tempMin} useCelsius={useCelsius} size="sm" showUnit={false} animate={false} /></span>
        </div>
        {/* AQI Badge */}
        {aq.unavailable ? (
          <Badge
            className="mt-1 px-3 py-1 text-xs font-medium rounded-full border-gray-500/30 bg-gray-500/10 text-gray-400"
            variant="outline"
          >
            AQI Unavailable
          </Badge>
        ) : (
          <Badge
            className="mt-1 px-3 py-1 text-xs font-medium rounded-full"
            style={{ backgroundColor: `${aq.color}25`, color: aq.color, borderColor: `${aq.color}40` }}
            variant="outline"
          >
            AQI {aq.aqi} · {aq.level.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        )}
      </div>

      <WeatherAlertsCard weather={data.current} airQuality={data.airQuality} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UvIndexCard uvi={data.current.uvi} isDaytime={isDaytime} />
        <ComfortCard weather={data.current} useCelsius={useCelsius} />
      </div>
      <HourlyForecastCard hourly={data.hourly} timezoneName={data.timezone} useCelsius={useCelsius} />
      <DailyForecastCard daily={data.daily} timezoneName={data.timezone} useCelsius={useCelsius} />
    </motion.div>
  );
}

// ============================================================
// Glass Layout — Frosted glass single-card widget
// ============================================================

function GlassLayout({ data, useCelsius, onRefreshAqi, isRefreshingAqi }: LayoutProps) {
  const current = data.current;
  const aq = data.airQuality;
  const isDaytime = (() => {
    const now = Math.floor(Date.now() / 1000);
    return now > current.sunrise && now < current.sunset;
  })();

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Main frosted glass card */}
      <div className={`skyguard-card skyguard-card-gradient skyguard-card-${current.condition} p-4 sm:p-6 shadow-xl`}>
        {/* Top row: icon + temp + condition */}
        <div className="flex items-center gap-2.5 mb-1">
          <WeatherIcon condition={current.condition} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <TemperatureDisplay value={current.temp} useCelsius={useCelsius} size="xl" className="!text-3xl sm:!text-5xl" />
              <span className="text-white/75 text-xs sm:text-sm capitalize truncate font-medium">{current.description}</span>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <MapPin className="h-3 w-3 text-white/60 shrink-0" />
          <span className="text-white/75 text-xs sm:text-sm truncate font-medium">{data.location.name}{data.location.country ? `, ${data.location.country}` : ''}</span>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/15 mb-3" />

        {/* Bottom info row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
          {/* Humidity */}
          <div className="flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-white/90 text-xs sm:text-sm font-semibold">{current.humidity}%</p>
              <p className="text-white/55 text-[9px] sm:text-[10px] leading-tight font-medium">Humidity</p>
            </div>
          </div>
          {/* Wind */}
          <div className="flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-white/90 text-xs sm:text-sm font-semibold">{current.windSpeed} m/s</p>
              <p className="text-white/55 text-[9px] sm:text-[10px] leading-tight font-medium">Wind</p>
            </div>
          </div>
          {/* AQI badge */}
          <div className="flex items-center gap-1.5">
            {aq.unavailable ? (
              <div className="min-w-0">
                <p className="text-white/60 text-xs sm:text-sm font-semibold">N/A</p>
                <p className="text-white/55 text-[9px] sm:text-[10px] leading-tight font-medium">AQI</p>
              </div>
            ) : (
              <Badge
                className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full shrink-0"
                style={{ backgroundColor: `${aq.color}25`, color: aq.color, borderColor: `${aq.color}40` }}
                variant="outline"
              >
                AQI {aq.aqi}
              </Badge>
            )}
          </div>
        </div>

        {/* Sunrise / Sunset row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sunrise className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-white/75 text-xs font-medium">{formatTime(current.sunrise, data.timezone)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sunset className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-white/75 text-xs font-medium">{formatTime(current.sunset, data.timezone)}</span>
          </div>
        </div>
      </div>

      {/* Additional cards below */}
      <AqDetailCard airQuality={data.airQuality} onRefreshAqi={onRefreshAqi} isRefreshingAqi={isRefreshingAqi} />
      <WeatherAlertsCard weather={data.current} airQuality={data.airQuality} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UvIndexCard uvi={data.current.uvi} isDaytime={isDaytime} />
        <ComfortCard weather={data.current} useCelsius={useCelsius} />
      </div>
      <HourlyForecastCard hourly={data.hourly} timezoneName={data.timezone} useCelsius={useCelsius} />
      <DailyForecastCard daily={data.daily} timezoneName={data.timezone} useCelsius={useCelsius} />
    </motion.div>
  );
}

// ============================================================
// Timeline Layout — Vertical timeline of weather events
// ============================================================

function TimelineLayout({ data, useCelsius, onRefreshAqi, isRefreshingAqi }: LayoutProps) {
  const current = data.current;
  const aq = data.airQuality;
  const now = Math.floor(Date.now() / 1000);
  const isDaytime = now > current.sunrise && now < current.sunset;

  // Find the "peak" hourly forecast around noon for the timeline
  const noonHour = data.hourly.find((h) => {
    const hour = new Date(h.dt * 1000).getHours();
    return hour >= 11 && hour <= 13;
  });

  // Build timeline events
  const timelineEvents = [
    {
      id: 'sunrise',
      icon: <Sunrise className="h-3.5 w-3.5 text-amber-400" />,
      label: 'Sunrise',
      time: formatTime(current.sunrise, data.timezone),
      detail: '',
      dotColor: 'bg-amber-400',
      isNow: false,
    },
    {
      id: 'noon',
      icon: <WeatherIcon condition={noonHour?.condition || 'clear'} size={16} />,
      label: noonHour ? `${new Date(noonHour.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', timeZone: data.timezone })}` : 'Noon',
      time: noonHour ? formatTime(noonHour.dt, data.timezone) : '',
      detail: noonHour ? `${Math.round(noonHour.temp)}°` : '',
      dotColor: 'bg-yellow-400',
      isNow: false,
    },
    {
      id: 'now',
      icon: <CircleDot className="h-3.5 w-3.5 text-emerald-400" />,
      label: 'Now',
      time: formatTime(now, data.timezone),
      detail: '',
      dotColor: 'bg-emerald-400',
      isNow: true,
    },
    {
      id: 'sunset',
      icon: <Sunset className="h-3.5 w-3.5 text-orange-400" />,
      label: 'Sunset',
      time: formatTime(current.sunset, data.timezone),
      detail: '',
      dotColor: 'bg-orange-400',
      isNow: false,
    },
  ];

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Timeline card */}
      <div className="skyguard-card skyguard-card-gradient skyguard-card-accent p-4 sm:p-6 shadow-xl">
        {/* Header row: location + temp + icon */}
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-3 w-3 text-white/60 shrink-0" />
          <span className="text-white/80 text-xs sm:text-sm truncate flex-1 font-medium">{data.location.name}{data.location.country ? `, ${data.location.country}` : ''}</span>
          <TemperatureDisplay value={current.temp} useCelsius={useCelsius} size="lg" />
          <WeatherIcon condition={current.condition} size={28} />
        </div>

        {/* Condition + AQI */}
        <div className="flex items-center gap-2 mb-2 ml-5">
          <span className="text-white/65 text-[10px] sm:text-xs capitalize font-medium">{current.description}</span>
          {!aq.unavailable && (
            <Badge
              className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full"
              style={{ backgroundColor: `${aq.color}20`, color: aq.color, borderColor: `${aq.color}30` }}
              variant="outline"
            >
              AQI {aq.aqi}
            </Badge>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/15 mb-3" />

        {/* Timeline */}
        <div className="relative ml-1">
          {timelineEvents.map((event, index) => (
            <motion.div
              key={event.id}
              className="relative flex items-start gap-3 pb-4 last:pb-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              {/* Timeline line + dot */}
              <div className="relative flex flex-col items-center shrink-0">
                <div
                  className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full ${
                    event.isNow
                      ? 'bg-emerald-500/20 ring-2 ring-emerald-400/50'
                      : 'bg-white/[0.06]'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${event.dotColor}`} />
                </div>
                {index < timelineEvents.length - 1 && (
                  <div className="w-px flex-1 bg-white/10 mt-1 min-h-[16px]" />
                )}
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5">
                  {event.icon}
                  <span className={`text-xs sm:text-sm font-semibold ${event.isNow ? 'text-white' : 'text-white/80'}`}>
                    {event.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 ml-5">
                  <span className="text-white/65 text-[10px] sm:text-xs">{event.time}</span>
                  {event.detail && (
                    <span className="text-white/80 text-[10px] sm:text-xs font-semibold">{event.detail}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Additional cards below */}
      <AqDetailCard airQuality={data.airQuality} onRefreshAqi={onRefreshAqi} isRefreshingAqi={isRefreshingAqi} />
      <WeatherAlertsCard weather={data.current} airQuality={data.airQuality} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UvIndexCard uvi={data.current.uvi} isDaytime={isDaytime} />
        <ComfortCard weather={data.current} useCelsius={useCelsius} />
      </div>
      <HourlyForecastCard hourly={data.hourly} timezoneName={data.timezone} useCelsius={useCelsius} />
      <DailyForecastCard daily={data.daily} timezoneName={data.timezone} useCelsius={useCelsius} />
    </motion.div>
  );
}

const layoutMap: Record<WidgetStyle, React.FC<LayoutProps>> = {
  classic: ClassicLayout,
  compact: CompactLayout,
  gauge: GaugeLayout,
  minimal: MinimalLayout,
  glass: GlassLayout,
  timeline: TimelineLayout,
};

// ============================================================
// Main Page
// ============================================================

export default function Home() {
  const {
    location,
    setLocation,
    widgetStyle,
    setWidgetStyle,
    weatherData,
    setWeatherData,
    isLoading,
    setIsLoading,
    error,
    setError,
    useCelsius,
    biometricLock,
    setBiometricLock,
    lastUpdated,
  } = useWeatherStore();

  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingAqi, setIsRefreshingAqi] = useState(false);
  const [nextRefreshIn, setNextRefreshIn] = useState(REFRESH_INTERVAL);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aqiRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determine if it's daytime based on current hour
  const isDaytime = (() => {
    if (!weatherData) return true;
    const now = Math.floor(Date.now() / 1000);
    return now > weatherData.current.sunrise && now < weatherData.current.sunset;
  })();

  // Fetch weather data (full) — direct client-side call to Open-Meteo
  const fetchWeather = useCallback(async (lat: number, lon: number, name: string, country: string = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const data: WeatherData = await fetchWeatherClient(lat, lon);
      // Override location name from search
      data.location = { ...data.location, name, lat, lon, country: country || data.location.country };
      setWeatherData(data);
      // Update native Android widget
      updateNativeWidget(data, useCelsius);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError, setWeatherData]);

  // Fetch AQI data only (lightweight, for live refresh) — direct client-side call
  const fetchAqiOnly = useCallback(async () => {
    if (!location || !weatherData) return;
    setIsRefreshingAqi(true);
    try {
      const aqData: AirQualityData = await fetchAirQualityClient(location.lat, location.lon);
      // Update only the airQuality portion of weatherData
      const updatedData = { ...weatherData, airQuality: aqData };
      setWeatherData(updatedData);
      // Update native Android widget
      updateNativeWidget(updatedData, useCelsius);
    } catch {
      // Silently fail - keep existing data
    } finally {
      setIsRefreshingAqi(false);
    }
  }, [location, weatherData, setWeatherData]);

  // Handle location selection
  const handleLocationSelect = useCallback((lat: number, lon: number, name: string, country: string) => {
    setLocation({ lat, lon, name, country });
    fetchWeather(lat, lon, name);
  }, [setLocation, fetchWeather]);

  // Return to the home/welcome screen — clears weather data so the
  // welcome screen renders, while keeping the last location on file.
  const handleGoHome = useCallback(() => {
    useWeatherStore.setState({ weatherData: null, error: null, isLoading: false });
    setShowWidgetPicker(false);
    setShowMobileMenu(false);
    setShowHeaderSearch(false);
  }, []);

  // Refresh weather data (full)
  const handleRefresh = useCallback(() => {
    if (!location) return;
    setIsRefreshing(true);
    setNextRefreshIn(REFRESH_INTERVAL);
    fetchWeather(location.lat, location.lon, location.name).finally(() => {
      setIsRefreshing(false);
    });
  }, [location, fetchWeather]);

  // Refresh AQI data only
  const handleRefreshAqi = useCallback(() => {
    fetchAqiOnly();
  }, [fetchAqiOnly]);

  // Auto-refresh: Set up polling intervals
  useEffect(() => {
    if (!location || !weatherData) return;

    // Clear any existing intervals
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (aqiRefreshRef.current) clearInterval(aqiRefreshRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Reset countdown
    setNextRefreshIn(REFRESH_INTERVAL);

    // Countdown timer (updates every second)
    countdownRef.current = setInterval(() => {
      setNextRefreshIn((prev) => {
        const next = prev - 1000;
        return next <= 0 ? 0 : next;
      });
    }, 1000);

    // Full weather auto-refresh (5 minutes)
    autoRefreshRef.current = setInterval(() => {
      if (location) {
        setIsRefreshing(true);
        fetchWeather(location.lat, location.lon, location.name).finally(() => {
          setIsRefreshing(false);
        });
        setNextRefreshIn(REFRESH_INTERVAL);
      }
    }, REFRESH_INTERVAL);

    // AQI-only auto-refresh (2 minutes for live AQI updates)
    aqiRefreshRef.current = setInterval(() => {
      fetchAqiOnly();
    }, AQI_REFRESH_INTERVAL);

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      if (aqiRefreshRef.current) clearInterval(aqiRefreshRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [location, weatherData, fetchWeather, fetchAqiOnly]);

  // On-demand geolocation — only triggered when the user clicks
  // "Use my current location" on the welcome screen. The app never
  // auto-loads any weather data on page open; it shows the welcome
  // screen until the user explicitly searches or locates themselves.
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      // Geolocation unsupported — keep the welcome screen visible so the
      // user can search manually. We do NOT set a global error here because
      // that would swap the welcome screen for an error screen whose retry
      // button can't work without a location.
      setIsLocating(false);
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude, name: 'Current Location', country: '' });
        fetchWeather(latitude, longitude, 'Current Location').finally(() => setIsLocating(false));
      },
      () => {
        // Permission denied or timeout — silently return to the welcome
        // screen so the user can search for a city instead.
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [setLocation, fetchWeather]);

  const LayoutComponent = layoutMap[widgetStyle];

  return (
    <TooltipProvider>
      <div className="skyguard-app relative min-h-dvh flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Animated background */}
        <AnimatedBackground
          condition={weatherData?.current.condition || 'partly-cloudy'}
          isDaytime={isDaytime}
        />

        {/* Header - Mobile-first responsive design */}
        <header className="relative z-20 px-3 sm:px-6 pt-2 pb-1.5 sm:py-3">
          {/* Top row: Logo + action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Logo — click to return to the home/welcome screen */}
            <motion.button
              type="button"
              onClick={handleGoHome}
              className="flex items-center gap-1.5 shrink-0 rounded-lg hover:bg-white/10 px-1.5 py-1 -ml-1.5 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              aria-label="SkyGuard home"
            >
              <WeatherIcon condition={weatherData?.current.condition || 'partly-cloudy'} size={24} />
              <h1 className="text-base font-bold text-white sm:text-lg">SkyGuard</h1>
            </motion.button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action buttons - visible on all screens */}
            <motion.div
              className="flex items-center gap-0.5 sm:gap-1.5 shrink-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Refresh */}
              {weatherData && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh weather data"
                >
                  <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              )}

              {/* Search toggle — only when weather data is loaded.
                  The welcome screen has its own search bar, so we don't
                  duplicate it here. This opens an inline search row. */}
              {weatherData && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-lg h-8 w-8 sm:h-9 sm:w-9 ${showHeaderSearch ? 'text-white bg-white/15' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  onClick={() => setShowHeaderSearch(!showHeaderSearch)}
                  aria-label="Search city"
                >
                  <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}

              {/* Share button */}
              {weatherData && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => {
                    const temp = useCelsius ? `${Math.round(weatherData.current.temp)}°C` : `${Math.round(weatherData.current.temp * 9 / 5 + 32)}°F`;
                    const condition = weatherData.current.description;
                    const aqiText = !weatherData.airQuality.unavailable
                      ? ` | AQI: ${weatherData.airQuality.aqi} (${weatherData.airQuality.level.replace('-', ' ')})`
                      : '';
                    const text = `🌤️ SkyGuard Weather: ${weatherData.location.name} - ${temp}, ${condition}${aqiText}`;
                    if (navigator.share) {
                      navigator.share({ text }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(text).then(() => {
                        alert('Weather info copied to clipboard!');
                      }).catch(() => {
                        alert('Failed to copy');
                      });
                    }
                  }}
                  aria-label="Share weather"
                >
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}

              {/* Widget picker toggle */}
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-lg h-8 w-8 sm:h-9 sm:w-9 ${showWidgetPicker ? 'text-white bg-white/15' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                onClick={() => setShowWidgetPicker(!showWidgetPicker)}
                aria-label="Change widget style"
              >
                <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>

              {/* More menu on mobile, settings on desktop */}
              <div className="hidden sm:flex items-center gap-1.5">
                {/* Settings */}
                <SettingsPanel
                  useCelsius={useCelsius}
                  onToggleUnit={() => useWeatherStore.getState().setUseCelsius(!useCelsius)}
                  biometricLock={biometricLock}
                  onToggleBiometric={() => setBiometricLock(!biometricLock)}
                />
              </div>

              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-lg h-8 w-8 sm:hidden text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-label="Menu"
              >
                {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </motion.div>
          </div>

          {/* Mobile dropdown menu */}
          <AnimatePresence>
            {showMobileMenu && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden sm:hidden"
              >
                <div className="flex items-center gap-2 py-2">
                  {/* Share (mobile) */}
                  {weatherData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-white/70 hover:text-white hover:bg-white/10 text-xs gap-1.5"
                      onClick={() => {
                        const temp = useCelsius ? `${Math.round(weatherData.current.temp)}°C` : `${Math.round(weatherData.current.temp * 9 / 5 + 32)}°F`;
                        const condition = weatherData.current.description;
                        const aqiText = !weatherData.airQuality.unavailable
                          ? ` | AQI: ${weatherData.airQuality.aqi} (${weatherData.airQuality.level.replace('-', ' ')})`
                          : '';
                        const text = `🌤️ SkyGuard Weather: ${weatherData.location.name} - ${temp}, ${condition}${aqiText}`;
                        if (navigator.share) {
                          navigator.share({ text }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(text).then(() => {
                            alert('Weather info copied to clipboard!');
                          }).catch(() => {
                            alert('Failed to copy');
                          });
                        }
                      }}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </Button>
                  )}
                  <SettingsPanel
                    useCelsius={useCelsius}
                    onToggleUnit={() => useWeatherStore.getState().setUseCelsius(!useCelsius)}
                    biometricLock={biometricLock}
                    onToggleBiometric={() => setBiometricLock(!biometricLock)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inline search row — only shown when the search toggle is active
              AND weather data is loaded. The welcome screen has its own
              dedicated search bar, so we never duplicate it there. */}
          <AnimatePresence>
            {showHeaderSearch && weatherData && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="mt-1.5 sm:mt-2 w-full relative z-50"
              >
                <SearchBar onSelect={(lat, lon, name, country) => {
                  handleLocationSelect(lat, lon, name, country);
                  setShowHeaderSearch(false);
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Main content */}
        <main className="relative z-10 flex-1 px-3 sm:px-6 pb-4 sm:pb-6 overflow-x-hidden">
          <div className="max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              {isLoading && !weatherData ? (
                <LoadingSkeleton key="loading" />
              ) : error && !weatherData ? (
                <ErrorDisplay key="error" error={error} onRetry={handleRefresh} />
              ) : !weatherData ? (
                <WelcomeScreen
                  key="welcome"
                  onLocationSelect={handleLocationSelect}
                  onUseMyLocation={handleUseMyLocation}
                  isLocating={isLocating}
                />
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Widget style picker (collapsible) */}
                  <AnimatePresence>
                    {showWidgetPicker && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden mb-3"
                      >
                        <div className="skyguard-card p-3 sm:p-4">
                          <h3 className="text-xs sm:text-sm font-semibold text-white/80 mb-2 sm:mb-3 flex items-center gap-2">
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Choose Layout
                          </h3>
                          <WidgetPicker
                            currentStyle={widgetStyle}
                            onStyleChange={(style) => {
                              setWidgetStyle(style);
                              setShowWidgetPicker(false);
                            }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Weather content */}
                  <LayoutComponent
                    data={weatherData}
                    useCelsius={useCelsius}
                    onRefreshAqi={handleRefreshAqi}
                    isRefreshingAqi={isRefreshingAqi}
                  />

                  {/* Live data indicator */}
                  <LiveDataIndicator
                    fetchedAt={weatherData.fetchedAt || lastUpdated}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    nextRefreshIn={nextRefreshIn}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 mt-auto px-3 sm:px-6 py-3 sm:py-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}>
          <Separator className="bg-white/10 mb-2 sm:mb-3" />
          <div className="flex items-center justify-between text-white/50 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              <span className="truncate">Secured · Live data via Open-Meteo</span>
            </div>
            <span className="truncate">SkyGuard Weather</span>
          </div>
        </footer>

        {/* PWA Install Prompt */}
        <InstallPrompt />
      </div>
    </TooltipProvider>
  );
}
