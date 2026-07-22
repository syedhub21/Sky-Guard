'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

// ============================================================
// TemperatureDisplay
// ============================================================

interface TemperatureDisplayProps {
  value: number;           // Always in °C
  useCelsius: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showUnit?: boolean;
  className?: string;
  animate?: boolean;
}

function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

function getDisplayValue(celsius: number, useCelsius: boolean): number {
  return useCelsius ? Math.round(celsius) : celsiusToFahrenheit(celsius);
}

function getUnitLabel(useCelsius: boolean): string {
  return useCelsius ? '°C' : '°F';
}

const sizeClasses: Record<string, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
  xl: 'text-5xl font-extralight tracking-tighter',
};

/**
 * Animated number display component for temperature values.
 * Converts °C ↔ °F based on the useCelsius prop.
 * Smoothly animates number changes.
 */
export function TemperatureDisplay({
  value,
  useCelsius,
  size = 'md',
  showUnit = true,
  className = '',
  animate = true,
}: TemperatureDisplayProps) {
  const displayValue = getDisplayValue(value, useCelsius);
  const unit = getUnitLabel(useCelsius);
  const prevValueRef = useRef(displayValue);
  const rafRef = useRef<number | null>(null);
  const [displayedValue, setDisplayedValue] = useState(displayValue);

  const animateToValue = useCallback((target: number, duration: number) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    const startValue = prevValueRef.current;
    const diff = target - startValue;

    if (diff === 0) return;

    const startTime = Date.now();

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = duration === 0 ? 1 : 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * eased);
      setDisplayedValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prevValueRef.current = target;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (prevValueRef.current !== displayValue) {
      animateToValue(displayValue, animate ? 400 : 0);
    }
  }, [displayValue, animate, animateToValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <span
      className={`inline-flex items-baseline gap-0.5 ${sizeClasses[size]} ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={useCelsius ? 'c' : 'f'}
          initial={{ opacity: 0.6, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="text-white font-semibold"
        >
          {displayedValue}
        </motion.span>
      </AnimatePresence>
      {showUnit && (
        <motion.span
          key={unit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          className="text-white/70"
          style={{ fontSize: '0.55em' }}
        >
          {unit}
        </motion.span>
      )}
    </span>
  );
}

// ============================================================
// WeatherDetailItem - High-contrast, mobile-optimized card
// ============================================================

interface WeatherDetailItemProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
}

/**
 * A compact detail card showing a labeled metric with an icon.
 * Uses the skyguard-detail-item class for visible backgrounds.
 * High contrast text with colored icon backgrounds.
 */
export function WeatherDetailItem({
  icon: Icon,
  label,
  value,
  unit,
  className = '',
}: WeatherDetailItemProps) {
  return (
    <motion.div
      className={`skyguard-detail-item group flex items-center gap-2.5 sm:flex-col sm:items-center sm:gap-1
        px-3 py-2.5 sm:p-3 cursor-default ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {/* Icon with colored background circle */}
      <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/10 shrink-0">
        <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-white/80" />
      </div>
      <div className="flex flex-col sm:items-center gap-0 sm:gap-0.5 min-w-0 flex-1 sm:flex-none">
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm sm:text-base font-bold text-white">{value}</span>
          {unit && (
            <span className="text-[10px] sm:text-xs text-white/60 font-medium">{unit}</span>
          )}
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-white/60 leading-tight">{label}</span>
      </div>
    </motion.div>
  );
}

export default TemperatureDisplay;
