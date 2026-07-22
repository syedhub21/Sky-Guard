'use client';

import { motion } from 'framer-motion';
import {
  HeartPulse,
  Wind,
  AlertTriangle,
  ShieldCheck,
  Info,
  Radio,
  RefreshCw,
  CloudOff,
} from 'lucide-react';
import type { AirQualityData, AQILevel, AQISource } from '@/lib/weather-types';
import { getAQILevel } from '@/lib/weather-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import AqGauge from './aq-gauge';

// Pollutant safe ranges and display config
interface PollutantConfig {
  key: keyof AirQualityData;
  label: string;
  unit: string;
  safeMax: number;
  icon: string;
}

const POLLUTANTS: PollutantConfig[] = [
  { key: 'pm25', label: 'PM2.5', unit: '\u00B5g/m\u00B3', safeMax: 25, icon: '\u1D30' },
  { key: 'pm10', label: 'PM10', unit: '\u00B5g/m\u00B3', safeMax: 50, icon: '\u1D31' },
  { key: 'o3', label: 'O\u2083', unit: '\u00B5g/m\u00B3', safeMax: 100, icon: '\u1D32' },
  { key: 'no2', label: 'NO\u2082', unit: '\u00B5g/m\u00B3', safeMax: 40, icon: '\u1D33' },
  { key: 'so2', label: 'SO\u2082', unit: '\u00B5g/m\u00B3', safeMax: 20, icon: '\u1D34' },
  { key: 'co', label: 'CO', unit: '\u00B5g/m\u00B3', safeMax: 4400, icon: '\u1D35' },
  { key: 'nh3', label: 'NH\u2083', unit: '\u00B5g/m\u00B3', safeMax: 200, icon: '\u1D36' },
];

// AQI scale items for the legend
const AQI_SCALE = [
  { range: '0\u201350', color: '#22c55e', label: 'Good' },
  { range: '51\u2013100', color: '#eab308', label: 'Moderate' },
  { range: '101\u2013150', color: '#f97316', label: 'Unhealthy*' },
  { range: '151\u2013200', color: '#ef4444', label: 'Unhealthy' },
  { range: '201\u2013300', color: '#a855f7', label: 'Very Unhealthy' },
  { range: '301\u2013400', color: '#991b1b', label: 'Hazardous' },
  { range: '401\u2013500', color: '#7f1d1d', label: 'Very Hazardous' },
];

// Data source display config
const SOURCE_LABELS: Record<AQISource, { label: string; icon: string; color: string }> = {
  'open-meteo': { label: 'Open-Meteo', icon: '\u2601', color: '#22c55e' },
  'waqi': { label: 'WAQI Live', icon: '\u{1F310}', color: '#3b82f6' },
  'none': { label: 'Unavailable', icon: '\u26A0', color: '#6b7280' },
};

// Health advice icon based on level
function getHealthIcon(level: AQILevel) {
  switch (level) {
    case 'good':
      return <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />;
    case 'moderate':
      return <Info className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />;
    case 'unhealthy-sensitive':
      return <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />;
    case 'unhealthy':
      return <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />;
    case 'very-unhealthy':
      return <HeartPulse className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />;
    case 'hazardous':
      return <HeartPulse className="h-5 w-5 sm:h-6 sm:w-6 text-red-900" />;
    case 'very-hazardous':
      return <HeartPulse className="h-5 w-5 sm:h-6 sm:w-6 text-red-950" />;
  }
}

// Get color for a pollutant based on how it compares to safe level
function getPollutantColor(value: number, safeMax: number): string {
  if (value < 0) return '#6b7280'; // unavailable
  const ratio = value / safeMax;
  if (ratio <= 0.5) return '#22c55e';
  if (ratio <= 0.8) return '#eab308';
  if (ratio <= 1.0) return '#f97316';
  if (ratio <= 1.5) return '#ef4444';
  return '#991b1b';
}

// Get bar fill percentage for a pollutant (capped at 100%)
function getPollutantBarPercent(value: number, safeMax: number): number {
  if (value < 0) return 0; // unavailable
  return Math.min((value / safeMax) * 100, 100);
}

interface AqDetailCardProps {
  airQuality: AirQualityData;
  onRefreshAqi?: () => void;
  isRefreshingAqi?: boolean;
}

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const gaugeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: 'easeOut' as const },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: 0.1 * i, ease: 'easeOut' as const },
  }),
};

export default function AqDetailCard({ airQuality, onRefreshAqi, isRefreshingAqi }: AqDetailCardProps) {
  const { aqi, color, level, mainPollutant, healthAdvice, source, unavailable } = airQuality;
  const sourceInfo = SOURCE_LABELS[source || 'none'];

  // ---- Unavailable state ----
  if (unavailable) {
    return (
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card className="skyguard-card skyguard-card-gradient skyguard-card-aqi overflow-hidden shadow-xl">
          <CardHeader className="pb-1.5 sm:pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <Wind className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                <CardTitle className="text-sm sm:text-lg font-bold text-white">
                  Air Quality
                </CardTitle>
              </div>
              {onRefreshAqi && (
                <button
                  onClick={onRefreshAqi}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Retry fetching AQI"
                >
                  <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 text-white/60 ${isRefreshingAqi ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="flex flex-col items-center gap-3 py-6">
              <CloudOff className="h-10 w-10 sm:h-12 sm:w-12 text-white/30" />
              <div className="text-center">
                <p className="text-white/70 font-semibold text-sm">AQI Data Unavailable</p>
                <p className="text-white/50 text-xs mt-1">
                  Tap retry to try again.
                </p>
              </div>
              {onRefreshAqi && (
                <button
                  onClick={onRefreshAqi}
                  disabled={isRefreshingAqi}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white/80 text-xs font-medium transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingAqi ? 'animate-spin' : ''}`} />
                  Retry
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="skyguard-card skyguard-card-gradient skyguard-card-aqi overflow-hidden shadow-xl">
        <CardHeader className="pb-1.5 sm:pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Wind className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
              <CardTitle className="text-sm sm:text-lg font-bold text-white">
                Air Quality
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Live data source badge */}
              <Badge
                variant="outline"
                className="gap-1 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold border-white/20"
                style={{
                  backgroundColor: `${sourceInfo.color}20`,
                  color: sourceInfo.color,
                  borderColor: `${sourceInfo.color}40`,
                }}
              >
                <Radio className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {sourceInfo.label}
              </Badge>
              {/* AQI refresh button */}
              {onRefreshAqi && (
                <button
                  onClick={onRefreshAqi}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  aria-label="Refresh AQI data"
                >
                  <RefreshCw className={`h-4 w-4 text-white/60 ${isRefreshingAqi ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          {/* AQI Gauge - responsive size */}
          <motion.div
            className="flex justify-center"
            variants={gaugeVariants}
            initial="hidden"
            animate="visible"
          >
            <AqGauge aqi={aqi} color={color} size={160} />
          </motion.div>

          {/* Health Advice */}
          <motion.div
            className="flex items-start gap-3 sm:gap-4 rounded-xl p-3 sm:p-4 border"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {getHealthIcon(level)}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-white/90">
                Health Advice
              </p>
              <p className="text-xs sm:text-sm text-white/70 mt-0.5 leading-relaxed">
                {healthAdvice}
              </p>
            </div>
          </motion.div>

          {/* Main Pollutant Highlight */}
          <motion.div
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg"
            style={{
              backgroundColor: `${color}15`,
              borderLeft: `4px solid ${color}`,
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" style={{ color }} />
            <span className="text-xs sm:text-sm font-semibold text-white/80">
              Main Pollutant:
            </span>
            <span className="text-xs sm:text-sm font-bold" style={{ color }}>
              {mainPollutant}
            </span>
          </motion.div>

          {/* Pollutant Grid - 2 cols on mobile, 3 on tablet, 4 on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {POLLUTANTS.map((pollutant, i) => {
              const value = airQuality[pollutant.key] as number;
              const isUnavailable = value < 0;
              const pColor = getPollutantColor(value, pollutant.safeMax);
              const barPercent = getPollutantBarPercent(value, pollutant.safeMax);
              const isMain = pollutant.label === mainPollutant;
              const isOverLimit = !isUnavailable && value > pollutant.safeMax;

              return (
                <motion.div
                  key={pollutant.key}
                  custom={i}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`
                          relative rounded-xl p-2.5 sm:p-3 cursor-default
                          border transition-all duration-200
                          hover:shadow-md hover:scale-[1.03]
                          ${isMain
                            ? 'ring-2 ring-offset-1'
                            : ''
                          }
                          ${isUnavailable ? 'opacity-40' : ''}
                        `}
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.25)',
                          borderColor: isMain ? `${color}40` : 'rgba(255, 255, 255, 0.12)',
                          outlineColor: isMain ? color : undefined,
                        }}
                      >
                        {/* Main pollutant badge */}
                        {isMain && !isUnavailable && (
                          <div
                            className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 text-[7px] sm:text-[9px] font-bold text-white px-1 sm:px-1.5 py-0.5 rounded-full shadow-sm"
                            style={{ backgroundColor: color }}
                          >
                            MAIN
                          </div>
                        )}

                        {/* Label */}
                        <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                          <span className="text-[10px] sm:text-xs font-bold text-white/60 uppercase tracking-wide">
                            {pollutant.label}
                          </span>
                          {isOverLimit && (
                            <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500" />
                          )}
                        </div>

                        {/* Value */}
                        <div className="flex items-baseline gap-0.5">
                          <span
                            className="text-sm sm:text-lg font-bold"
                            style={{ color: pColor }}
                          >
                            {isUnavailable ? '--' : value.toFixed(1)}
                          </span>
                          <span className="text-[8px] sm:text-[10px] text-white/55">
                            {pollutant.unit}
                          </span>
                        </div>

                        {/* Color indicator bar */}
                        <div className="mt-2 sm:mt-2.5 h-1.5 sm:h-2 w-full rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: pColor }}
                            initial={{ width: 0 }}
                            animate={{ width: `${barPercent}%` }}
                            transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[180px]">
                      <div className="space-y-1">
                        <p className="font-semibold text-xs">{pollutant.label}</p>
                        {isUnavailable ? (
                          <p className="text-[10px] opacity-80">Data unavailable</p>
                        ) : (
                          <>
                            <p className="text-[10px] opacity-80">
                              Current: {value.toFixed(1)} {pollutant.unit}
                            </p>
                            <p className="text-[10px] opacity-80">
                              Safe limit: {pollutant.safeMax} {pollutant.unit}
                            </p>
                            <p className="text-[10px] opacity-80">
                              {isOverLimit ? 'Over limit' : 'Within safe range'}
                            </p>
                          </>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              );
            })}
          </div>

          {/* AQI Color Scale Legend */}
          <motion.div
            className="pt-1 sm:pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          >
            <p className="text-[10px] sm:text-xs font-semibold text-white/55 mb-2 uppercase tracking-wide">
              AQI Scale (US EPA)
            </p>
            <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2">
              {AQI_SCALE.map((item) => (
                <div key={item.range} className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-sm shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[9px] sm:text-[11px] text-white/60 font-medium">
                    {item.range}
                  </span>
                  <span className="text-[9px] sm:text-[11px] font-bold text-white/80">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
