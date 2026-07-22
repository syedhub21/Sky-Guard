'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Droplets,
  Gauge,
  Eye,
  Sun,
  Thermometer,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { WeatherIcon } from './weather-icon';
import { TemperatureDisplay, WeatherDetailItem } from './weather-utils';
import {
  type CurrentWeather,
  type GeoLocation,
  formatTime,
} from '@/lib/weather-types';

// ============================================================
// Props
// ============================================================

interface CurrentWeatherCardProps {
  weather: CurrentWeather;
  location: GeoLocation;
  timezoneName: string;
  useCelsius: boolean;
}

// ============================================================
// Animation variants
// ============================================================

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

// ============================================================
// Sunrise/Sunset Arc Component
// ============================================================

function SunriseSunsetArc({ sunrise, sunset, timezoneName }: {
  sunrise: number;
  sunset: number;
  timezoneName: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const dayLength = sunset - sunrise;
  const progress = useMemo(() => {
    if (now < sunrise) return 0;
    if (now > sunset) return 1;
    return (now - sunrise) / dayLength;
  }, [now, sunrise, sunset, dayLength]);

  // Arc parameters
  const width = 200;
  const height = 80;
  const cx = width / 2;
  const cy = height - 4;
  const rx = 88;
  const ry = 64;

  // Sun position on the arc (parametric ellipse)
  const angle = Math.PI * (1 - progress); // PI (left) to 0 (right)
  const sunX = cx + rx * Math.cos(angle);
  const sunY = cy - ry * Math.sin(angle);

  const isDaytime = now >= sunrise && now <= sunset;

  return (
    <div className="flex flex-col items-center w-full" style={{ height: '80px' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[220px]"
        style={{ height: '56px' }}
      >
        {/* Dashed arc path (full semicircle) */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          style={{ transform: 'scale(1, -1)', transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Filled arc from sunrise to current sun position */}
        {isDaytime && (
          <path
            d={describeArc(cx, cy, rx, ry, Math.PI, angle)}
            fill="none"
            stroke="rgba(255,183,77,0.5)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transform: 'scale(1, -1)', transformOrigin: `${cx}px ${cy}px` }}
          />
        )}

        {/* Sun dot */}
        {isDaytime && (
          <>
            {/* Glow */}
            <circle
              cx={sunX}
              cy={sunY}
              r="8"
              fill="rgba(255,183,77,0.2)"
            />
            {/* Core */}
            <circle
              cx={sunX}
              cy={sunY}
              r="4"
              fill="#FFB74D"
              stroke="rgba(255,224,130,0.6)"
              strokeWidth="1.5"
            />
          </>
        )}

        {/* Sunrise marker */}
        <circle
          cx={cx - rx}
          cy={cy}
          r="2.5"
          fill="#FFB74D"
          opacity="0.7"
          style={{ transform: 'scale(1, -1)', transformOrigin: `${cx - rx}px ${cy}px` }}
        />

        {/* Sunset marker */}
        <circle
          cx={cx + rx}
          cy={cy}
          r="2.5"
          fill="#FF8A65"
          opacity="0.7"
          style={{ transform: 'scale(1, -1)', transformOrigin: `${cx + rx}px ${cy}px` }}
        />

        {/* Horizon line */}
        <line
          x1={cx - rx - 6}
          y1={cy}
          x2={cx + rx + 6}
          y2={cy}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
      </svg>

      {/* Sunrise / Sunset labels */}
      <div className="flex items-center justify-between w-full max-w-[220px] px-2 -mt-0.5">
        <span className="text-[10px] sm:text-xs text-amber-400/80 font-medium">{formatTime(sunrise, timezoneName)}</span>
        <span className="text-[10px] sm:text-xs text-orange-400/80 font-medium">{formatTime(sunset, timezoneName)}</span>
      </div>
    </div>
  );
}

/**
 * Generate an SVG arc path string for an elliptical arc.
 * We draw the arc from startAngle to endAngle (in radians, measured from positive x-axis).
 * Since we flip the y-axis with scale(1,-1), the arc is drawn as the upper semicircle.
 */
function describeArc(cx: number, cy: number, rx: number, ry: number, startAngle: number, endAngle: number): string {
  const startX = cx + rx * Math.cos(startAngle);
  const startY = cy + ry * Math.sin(startAngle);
  const endX = cx + rx * Math.cos(endAngle);
  const endY = cy + ry * Math.sin(endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  const sweep = endAngle > startAngle ? 1 : 0;
  return `M ${startX} ${startY} A ${rx} ${ry} 0 ${largeArc} ${sweep} ${endX} ${endY}`;
}

// ============================================================
// Wind Direction Compass Component
// ============================================================

function WindCompass({ windDeg, windSpeed }: { windDeg: number; windSpeed: number }) {
  const size = 60;
  const center = size / 2;
  const radius = 22;

  // Cardinal directions
  const cardinals = [
    { label: 'N', angle: -90 },
    { label: 'E', angle: 0 },
    { label: 'S', angle: 90 },
    { label: 'W', angle: 180 },
  ];

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
      >
        {/* Outer circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        {/* Inner circle */}
        <circle
          cx={center}
          cy={center}
          r={radius * 0.35}
          fill="rgba(255,255,255,0.08)"
          stroke="none"
        />

        {/* Cardinal labels */}
        {cardinals.map((c) => {
          const rad = (c.angle * Math.PI) / 180;
          const labelR = radius + 5;
          const x = center + labelR * Math.cos(rad);
          const y = center + labelR * Math.sin(rad);
          return (
            <text
              key={c.label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.45)"
              fontSize="7"
              fontWeight="600"
            >
              {c.label}
            </text>
          );
        })}

        {/* Wind direction arrow */}
        <g transform={`rotate(${windDeg}, ${center}, ${center})`}>
          {/* Arrow head */}
          <polygon
            points={`${center},${center - radius + 3} ${center - 3},${center - radius + 10} ${center + 3},${center - radius + 10}`}
            fill="#14b8a6"
            opacity="0.9"
          />
          {/* Arrow tail */}
          <line
            x1={center}
            y1={center - radius + 10}
            x2={center}
            y2={center + radius * 0.3}
            stroke="rgba(20,184,166,0.5)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Center dot */}
        <circle cx={center} cy={center} r="2" fill="rgba(255,255,255,0.6)" />
      </svg>
      <span className="text-[10px] sm:text-xs text-white/65 font-semibold">{windSpeed} m/s</span>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function CurrentWeatherCard({
  weather,
  location,
  timezoneName,
  useCelsius,
}: CurrentWeatherCardProps) {
  // UV index descriptor
  const getUVLabel = (uvi: number): string => {
    if (uvi <= 2) return 'Low';
    if (uvi <= 5) return 'Mod';
    if (uvi <= 7) return 'High';
    if (uvi <= 10) return 'V.High';
    return 'Extreme';
  };

  // Visibility formatting
  const formatVisibility = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}`;
    }
    return `${meters}`;
  };

  const visibilityUnit = weather.visibility >= 1000 ? 'km' : 'm';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card
        className={`skyguard-card skyguard-card-gradient skyguard-card-${weather.condition} overflow-hidden shadow-2xl`}
      >
        <CardContent className="relative z-10 p-4 sm:p-6">
          {/* ---- Header: Location + Temp ---- */}
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            {/* Location */}
            <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
              <span className="text-base sm:text-xl font-bold text-white truncate">
                {location.name}
              </span>
              {location.state && (
                <span className="text-xs sm:text-sm text-white/60 hidden sm:inline">
                  {location.state},
                </span>
              )}
              <span className="text-xs sm:text-sm text-white/60">
                {location.country}
              </span>
            </div>

            {/* Current temperature — HUGE and prominent */}
            <div className="flex items-center gap-3 sm:gap-4 mt-2">
              <TemperatureDisplay
                value={weather.temp}
                useCelsius={useCelsius}
                size="xl"
                className="leading-none !text-5xl sm:!text-7xl font-extralight"
              />
              <div className="flex flex-col items-start gap-0.5">
                <WeatherIcon
                  condition={weather.condition}
                  size={48}
                  className="sm:hidden drop-shadow-lg"
                />
                <WeatherIcon
                  condition={weather.condition}
                  size={64}
                  className="hidden sm:block drop-shadow-lg"
                />
              </div>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-lg text-white/80 capitalize mt-1 sm:mt-1.5 font-medium">
              {weather.description}
            </p>
          </motion.div>

          {/* ---- Secondary temps row ---- */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-4 sm:gap-5 text-xs sm:text-sm text-white/70 mb-4 sm:mb-6 flex-wrap"
          >
            <span className="flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
              Feels{' '}
              <TemperatureDisplay
                value={weather.feelsLike}
                useCelsius={useCelsius}
                size="sm"
                showUnit={true}
                animate={false}
                className="text-white font-bold"
              />
            </span>
            <span className="flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
              H:{' '}
              <TemperatureDisplay
                value={weather.tempMax}
                useCelsius={useCelsius}
                size="sm"
                showUnit={false}
                animate={false}
                className="font-bold text-white"
              />
              <span className="text-[10px]">°</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400" />
              L:{' '}
              <TemperatureDisplay
                value={weather.tempMin}
                useCelsius={useCelsius}
                size="sm"
                showUnit={false}
                animate={false}
                className="font-bold text-white"
              />
              <span className="text-[10px]">°</span>
            </span>
          </motion.div>

          {/* ---- Sunrise/Sunset Arc ---- */}
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            <SunriseSunsetArc
              sunrise={weather.sunrise}
              sunset={weather.sunset}
              timezoneName={timezoneName}
            />
          </motion.div>

          {/* ---- Details Grid ---- */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5"
          >
            <WeatherDetailItem
              icon={Droplets}
              label="Humidity"
              value={weather.humidity}
              unit="%"
            />

            {/* Wind compass replaces simple wind detail */}
            <div className="skyguard-detail-item flex items-center justify-center sm:flex-col sm:items-center px-2 py-2 sm:p-2 cursor-default col-span-1">
              <WindCompass windDeg={weather.windDeg} windSpeed={weather.windSpeed} />
            </div>

            <WeatherDetailItem
              icon={Gauge}
              label="Pressure"
              value={weather.pressure}
              unit="hPa"
            />
            <WeatherDetailItem
              icon={Eye}
              label="Visibility"
              value={formatVisibility(weather.visibility)}
              unit={visibilityUnit}
            />
            <WeatherDetailItem
              icon={Sun}
              label={`UV · ${getUVLabel(weather.uvi)}`}
              value={weather.uvi}
            />
            <WeatherDetailItem
              icon={Thermometer}
              label="Dew Point"
              value={(() => {
                const dp = useCelsius
                  ? Math.round(weather.dewPoint)
                  : Math.round((weather.dewPoint * 9) / 5 + 32);
                return dp;
              })()}
              unit={useCelsius ? '°C' : '°F'}
            />
            <WeatherDetailItem
              icon={Droplets}
              label="Clouds"
              value={weather.clouds}
              unit="%"
            />
            <WeatherDetailItem
              icon={Thermometer}
              label="Wind Gust"
              value={weather.windGust}
              unit="m/s"
            />
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default CurrentWeatherCard;
