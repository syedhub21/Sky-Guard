'use client';

import { motion } from 'framer-motion';
import { Sun, ShieldAlert, ShieldCheck } from 'lucide-react';

interface UvIndexCardProps {
  uvi: number;
  isDaytime: boolean;
}

function getUVLevel(uvi: number): { label: string; color: string; description: string; protection: string[] } {
  if (uvi <= 2) return {
    label: 'Low',
    color: '#22c55e',
    description: 'No danger from UV rays. Enjoy the outdoors safely.',
    protection: ['No sunscreen needed for brief exposure', 'Wear sunglasses on bright days'],
  };
  if (uvi <= 5) return {
    label: 'Moderate',
    color: '#eab308',
    description: 'Moderate risk from UV exposure. Take some precautions.',
    protection: ['Apply SPF 30+ sunscreen', 'Wear sunglasses', 'Seek shade during midday hours'],
  };
  if (uvi <= 7) return {
    label: 'High',
    color: '#f97316',
    description: 'High risk of harm from unprotected sun exposure.',
    protection: ['Apply SPF 50+ sunscreen every 2 hours', 'Wear UV-blocking sunglasses', 'Reduce sun exposure 10am-4pm', 'Wear a hat and long sleeves'],
  };
  if (uvi <= 10) return {
    label: 'Very High',
    color: '#ef4444',
    description: 'Very high risk. Take extra precautions.',
    protection: ['Apply SPF 50+ sunscreen every 2 hours', 'Wear protective clothing', 'Avoid sun 10am-4pm', 'Seek shade whenever possible', 'Wear wrap-around sunglasses'],
  };
  return {
    label: 'Extreme',
    color: '#991b1b',
    description: 'Extreme danger! Avoid sun exposure as much as possible.',
    protection: ['Stay indoors during peak hours', 'Apply SPF 50+ every 90 minutes', 'Wear UV-protective clothing', 'Use wide-brimmed hat and UV sunglasses', 'Avoid reflective surfaces like water/sand'],
  };
}

function getUVBarPercent(uvi: number): number {
  // UV index typically goes 0-11+, map to 0-100%
  return Math.min((uvi / 11) * 100, 100);
}

export function UvIndexCard({ uvi, isDaytime }: UvIndexCardProps) {
  const { label, color, description, protection } = getUVLevel(uvi);
  const barPercent = getUVBarPercent(uvi);

  // Don't show UV card at night
  if (!isDaytime || uvi <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="skyguard-card skyguard-card-gradient skyguard-card-accent overflow-hidden">
        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">UV Index</h3>
            </div>
            <span
              className="text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${color}25`, color, border: `1px solid ${color}40` }}
            >
              {uvi.toFixed(1)} · {label}
            </span>
          </div>

          {/* UV Progress Bar */}
          <div className="mb-4">
            <div className="h-3 sm:h-4 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, #22c55e 0%, #eab308 35%, #f97316 55%, #ef4444 75%, #991b1b 100%)`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${barPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-white/40 font-medium">0</span>
              <span className="text-[9px] text-white/40 font-medium">3</span>
              <span className="text-[9px] text-white/40 font-medium">6</span>
              <span className="text-[9px] text-white/40 font-medium">8</span>
              <span className="text-[9px] text-white/40 font-medium">11+</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-white/70 mb-3 leading-relaxed">{description}</p>

          {/* Protection tips */}
          <div className="space-y-2">
            <p className="text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider">Protection Tips</p>
            {protection.map((tip, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-2"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-white/10 shrink-0 mt-0.5">
                  {uvi <= 5 ? (
                    <ShieldCheck className="h-3 w-3 text-green-400" />
                  ) : (
                    <ShieldAlert className="h-3 w-3" style={{ color }} />
                  )}
                </div>
                <span className="text-[11px] sm:text-xs text-white/75 leading-snug">{tip}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default UvIndexCard;
