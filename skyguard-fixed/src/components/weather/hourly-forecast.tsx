'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Droplets } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HourlyForecast } from '@/lib/weather-types';
import { formatTime } from '@/lib/weather-types';
import { WeatherIcon } from './weather-icon';

interface HourlyForecastProps {
  hourly: HourlyForecast[];
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
      staggerChildren: 0.04,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

export function HourlyForecastCard({ hourly, timezoneName, useCelsius }: HourlyForecastProps) {
  const currentHour = useMemo(() => {
    return Math.floor(Date.now() / 1000);
  }, []);

  const { minTemp, maxTemp } = useMemo(() => {
    if (hourly.length === 0) return { minTemp: 0, maxTemp: 100 };
    const temps = hourly.map((h) => h.temp);
    return {
      minTemp: Math.min(...temps),
      maxTemp: Math.max(...temps),
    };
  }, [hourly]);

  const tempRange = maxTemp - minTemp || 1;

  function getTempBarWidth(temp: number): number {
    return ((temp - minTemp) / tempRange) * 100;
  }

  function getTempBarColor(temp: number): string {
    const ratio = (temp - minTemp) / tempRange;
    if (ratio < 0.25) return 'from-sky-400 to-sky-300';
    if (ratio < 0.5) return 'from-emerald-400 to-emerald-300';
    if (ratio < 0.75) return 'from-amber-400 to-amber-300';
    return 'from-orange-500 to-orange-400';
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
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
          Hourly Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="px-1.5 sm:px-2 pb-3 sm:pb-4">
        <motion.div
          className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-1 sm:pb-2 snap-x snap-mandatory -mx-0.5"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {hourly.map((hour, index) => {
            const isCurrentHour =
              Math.abs(hour.dt - currentHour) < 3600 && index === 0;
            const isNearCurrent =
              Math.abs(hour.dt - currentHour) < 1800;

            return (
              <motion.div
                key={hour.dt}
                variants={itemVariants}
                className={cn(
                  'flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3 py-2.5 sm:py-3 min-w-[64px] sm:min-w-[76px] snap-center',
                  'transition-colors duration-200',
                  isNearCurrent
                    ? 'bg-white/15 shadow-lg ring-1 ring-white/25'
                    : 'bg-white/[0.06] hover:bg-white/10'
                )}
              >
                {/* Time */}
                <span
                  className={cn(
                    'text-[10px] sm:text-xs font-semibold whitespace-nowrap',
                    isNearCurrent
                      ? 'text-amber-300 font-bold'
                      : 'text-white/70'
                  )}
                >
                  {isCurrentHour ? 'Now' : formatTime(hour.dt, timezoneName)}
                </span>

                {/* Weather Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: index * 0.04 + 0.2,
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                  }}
                >
                  <WeatherIcon
                    condition={hour.condition}
                    size={28}
                    className="drop-shadow-sm"
                  />
                </motion.div>

                {/* Temperature with sparkline bar */}
                <div className="relative flex flex-col items-center w-full">
                  {/* Temperature bar behind */}
                  <div className="w-full h-1.5 sm:h-2 rounded-full bg-white/[0.08] mb-1.5 overflow-hidden">
                    <motion.div
                      className={cn(
                        'h-full rounded-full bg-gradient-to-r',
                        getTempBarColor(hour.temp)
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${getTempBarWidth(hour.temp)}%` }}
                      transition={{
                        delay: index * 0.04 + 0.3,
                        duration: 0.6,
                        ease: 'easeOut',
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-sm sm:text-base font-bold',
                      isNearCurrent ? 'text-white' : 'text-white/90'
                    )}
                  >
                    {formatTemp(hour.temp, useCelsius)}
                  </span>
                </div>

                {/* Precipitation probability */}
                {hour.pop > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Droplets className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-400" />
                    <span className="text-[9px] sm:text-[10px] text-sky-300 font-semibold">
                      {Math.round(hour.pop * 100)}%
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </CardContent>
    </Card>
  );
}
