'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Droplets } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DailyForecast } from '@/lib/weather-types';
import { formatDay } from '@/lib/weather-types';
import { WeatherIcon } from './weather-icon';

interface DailyForecastProps {
  daily: DailyForecast[];
  timezoneName: string;
  useCelsius: boolean;
}

function toFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

function formatTemp(temp: number, useCelsius: boolean): string {
  const value = useCelsius ? Math.round(temp) : toFahrenheit(temp);
  return `${value}°`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

export function DailyForecastCard({ daily, timezoneName, useCelsius }: DailyForecastProps) {
  const { overallMin, overallMax } = useMemo(() => {
    if (daily.length === 0) return { overallMin: 0, overallMax: 100 };
    const allMins = daily.map((d) => d.tempMin);
    const allMaxes = daily.map((d) => d.tempMax);
    return {
      overallMin: Math.min(...allMins),
      overallMax: Math.max(...allMaxes),
    };
  }, [daily]);

  const tempRange = overallMax - overallMin || 1;

  function getBarPosition(minTemp: number, maxTemp: number) {
    const left = ((minTemp - overallMin) / tempRange) * 100;
    const width = ((maxTemp - minTemp) / tempRange) * 100;
    return { left, width: Math.max(width, 4) };
  }

  function getBarGradient(minTemp: number, maxTemp: number): string {
    const avgTemp = (minTemp + maxTemp) / 2;
    const ratio = (avgTemp - overallMin) / tempRange;

    if (ratio < 0.2) return 'from-sky-500 to-sky-300';
    if (ratio < 0.4) return 'from-emerald-500 to-emerald-300';
    if (ratio < 0.6) return 'from-yellow-500 to-amber-300';
    if (ratio < 0.8) return 'from-orange-500 to-orange-300';
    return 'from-red-500 to-orange-400';
  }

  return (
    <Card
      className={cn(
        'skyguard-card skyguard-card-gradient skyguard-card-accent overflow-hidden shadow-lg'
      )}
    >
      <CardHeader className="pb-1.5 sm:pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
        <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/90">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-400 shrink-0"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          7-Day Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-3 pb-3 sm:pb-4">
        <motion.div
          className="flex flex-col gap-0.5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {daily.map((day, index) => {
            const barPos = getBarPosition(day.tempMin, day.tempMax);
            const gradient = getBarGradient(day.tempMin, day.tempMax);
            const dayLabel = formatDay(day.dt, timezoneName);
            const isToday = dayLabel === 'Today';
            const isTomorrow = dayLabel === 'Tomorrow';

            return (
              <motion.div
                key={`day-${index}-${day.dt}`}
                variants={itemVariants}
                className={cn(
                  'flex items-center gap-2 sm:gap-3 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 transition-colors duration-200',
                  isToday
                    ? 'bg-white/10 ring-1 ring-white/15'
                    : 'hover:bg-white/[0.06]'
                )}
              >
                {/* Day name */}
                <div className="w-14 sm:w-20 shrink-0">
                  <span
                    className={cn(
                      'text-xs sm:text-sm font-semibold',
                      isToday
                        ? 'text-amber-300 font-bold'
                        : isTomorrow
                          ? 'text-white font-semibold'
                          : 'text-white/80'
                    )}
                  >
                    {dayLabel}
                  </span>
                </div>

                {/* Icon - hide description on mobile to save space */}
                <div className="flex items-center gap-1.5 w-8 sm:w-24 shrink-0">
                  <WeatherIcon condition={day.condition} size={22} />
                  <span className="text-[10px] sm:text-xs text-white/60 truncate capitalize hidden sm:inline">
                    {day.description}
                  </span>
                </div>

                {/* Precipitation - smaller on mobile */}
                <div className="w-9 sm:w-12 shrink-0 flex items-center justify-center">
                  {day.pop > 0 ? (
                    <div className="flex items-center gap-0.5">
                      <Droplets className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-400" />
                      <span className="text-[9px] sm:text-[10px] text-sky-300 font-semibold">
                        {Math.round(day.pop * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[9px] text-white/25">—</span>
                  )}
                </div>

                {/* Temperature range bar */}
                <div className="flex-1 flex items-center gap-1.5 sm:gap-2 min-w-0">
                  {/* Min temp */}
                  <span className="text-[10px] sm:text-xs text-white/65 w-7 sm:w-9 text-right shrink-0 font-semibold">
                    {formatTemp(day.tempMin, useCelsius)}
                  </span>

                  {/* Visual gradient bar — more prominent */}
                  <div className="flex-1 h-2 sm:h-2.5 rounded-full bg-white/[0.08] relative overflow-hidden min-w-[40px] sm:min-w-[60px]">
                    <motion.div
                      className={cn(
                        'absolute top-0 h-full rounded-full bg-gradient-to-r',
                        gradient
                      )}
                      initial={{ left: 0, width: 0 }}
                      animate={{
                        left: `${barPos.left}%`,
                        width: `${barPos.width}%`,
                      }}
                      transition={{
                        delay: index * 0.06 + 0.3,
                        duration: 0.7,
                        ease: 'easeOut',
                      }}
                    />
                  </div>

                  {/* Max temp */}
                  <span className="text-[10px] sm:text-xs text-white font-bold w-7 sm:w-9 shrink-0">
                    {formatTemp(day.tempMax, useCelsius)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </CardContent>
    </Card>
  );
}
