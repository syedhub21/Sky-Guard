'use client';

import { motion } from 'framer-motion';
import { Heart, Thermometer, Droplets, Wind, Eye } from 'lucide-react';
import type { CurrentWeather } from '@/lib/weather-types';

interface ComfortCardProps {
  weather: CurrentWeather;
  useCelsius: boolean;
}

function getComfortScore(weather: CurrentWeather): {
  score: number; // 0-100
  label: string;
  color: string;
  icon: string;
  factors: { name: string; value: string; impact: 'positive' | 'neutral' | 'negative' }[];
} {
  let score = 70; // Start at comfortable baseline
  const factors: { name: string; value: string; impact: 'positive' | 'neutral' | 'negative' }[] = [];

  // Temperature comfort (ideal: 20-25°C)
  const temp = weather.temp;
  if (temp >= 20 && temp <= 25) {
    factors.push({ name: 'Temperature', value: `${Math.round(temp)}°C — Ideal`, impact: 'positive' });
  } else if (temp >= 15 && temp <= 30) {
    const deviation = temp < 20 ? 20 - temp : temp - 25;
    score -= deviation * 3;
    factors.push({ name: 'Temperature', value: `${Math.round(temp)}°C — ${temp < 20 ? 'Cool' : 'Warm'}`, impact: 'neutral' });
  } else if (temp > 30 && temp <= 38) {
    score -= (temp - 25) * 4;
    factors.push({ name: 'Temperature', value: `${Math.round(temp)}°C — Hot`, impact: 'negative' });
  } else if (temp > 38) {
    score -= 50;
    factors.push({ name: 'Temperature', value: `${Math.round(temp)}°C — Extreme Heat`, impact: 'negative' });
  } else if (temp < 15 && temp >= 5) {
    score -= (20 - temp) * 3;
    factors.push({ name: 'Temperature', value: `${Math.round(temp)}°C — Cold`, impact: 'negative' });
  } else {
    score -= 50;
    factors.push({ name: 'Temperature', value: `${Math.round(temp)}°C — Freezing`, impact: 'negative' });
  }

  // Humidity comfort (ideal: 30-60%)
  if (weather.humidity >= 30 && weather.humidity <= 60) {
    factors.push({ name: 'Humidity', value: `${weather.humidity}% — Comfortable`, impact: 'positive' });
  } else if (weather.humidity > 60 && weather.humidity <= 75) {
    score -= (weather.humidity - 60) * 1;
    factors.push({ name: 'Humidity', value: `${weather.humidity}% — Slightly Humid`, impact: 'neutral' });
  } else if (weather.humidity > 75) {
    score -= 15 + (weather.humidity - 75) * 0.5;
    factors.push({ name: 'Humidity', value: `${weather.humidity}% — Very Humid`, impact: 'negative' });
  } else {
    score -= (30 - weather.humidity) * 0.5;
    factors.push({ name: 'Humidity', value: `${weather.humidity}% — Dry`, impact: 'neutral' });
  }

  // Wind comfort (ideal: gentle breeze 2-6 m/s)
  if (weather.windSpeed >= 2 && weather.windSpeed <= 6) {
    factors.push({ name: 'Wind', value: `${weather.windSpeed} m/s — Pleasant Breeze`, impact: 'positive' });
  } else if (weather.windSpeed > 6 && weather.windSpeed <= 12) {
    score -= (weather.windSpeed - 6) * 2;
    factors.push({ name: 'Wind', value: `${weather.windSpeed} m/s — Breezy`, impact: 'neutral' });
  } else if (weather.windSpeed > 12) {
    score -= 20;
    factors.push({ name: 'Wind', value: `${weather.windSpeed} m/s — Strong Wind`, impact: 'negative' });
  } else {
    factors.push({ name: 'Wind', value: `${weather.windSpeed} m/s — Calm`, impact: 'positive' });
  }

  // Visibility
  if (weather.visibility >= 10000) {
    factors.push({ name: 'Visibility', value: `${(weather.visibility / 1000).toFixed(0)} km — Clear`, impact: 'positive' });
  } else if (weather.visibility >= 5000) {
    factors.push({ name: 'Visibility', value: `${(weather.visibility / 1000).toFixed(1)} km — Good`, impact: 'neutral' });
  } else {
    score -= 10;
    factors.push({ name: 'Visibility', value: `${(weather.visibility / 1000).toFixed(1)} km — Reduced`, impact: 'negative' });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: string;
  let color: string;
  let icon: string;

  if (score >= 80) { label = 'Very Comfortable'; color = '#22c55e'; icon = '😊'; }
  else if (score >= 65) { label = 'Comfortable'; color = '#84cc16'; icon = '🙂'; }
  else if (score >= 50) { label = 'Moderate'; color = '#eab308'; icon = '😐'; }
  else if (score >= 35) { label = 'Uncomfortable'; color = '#f97316'; icon = '😣'; }
  else { label = 'Very Uncomfortable'; color = '#ef4444'; icon = '😩'; }

  return { score, label, color, icon, factors };
}

export function ComfortCard({ weather, useCelsius }: ComfortCardProps) {
  const { score, label, color, icon, factors } = getComfortScore(weather);

  const factorIcons: Record<string, React.ReactNode> = {
    Temperature: <Thermometer className="h-3.5 w-3.5" />,
    Humidity: <Droplets className="h-3.5 w-3.5" />,
    Wind: <Wind className="h-3.5 w-3.5" />,
    Visibility: <Eye className="h-3.5 w-3.5" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="skyguard-card skyguard-card-gradient skyguard-card-accent overflow-hidden">
        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-5 w-5 text-rose-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">Comfort Index</h3>
          </div>

          {/* Score circle + label */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 shrink-0">
              {/* Background circle */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <motion.circle
                  cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - score / 100) }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                />
              </svg>
              <span className="text-2xl sm:text-3xl">{icon}</span>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-white">{score}<span className="text-sm text-white/60">/100</span></p>
              <p className="text-xs sm:text-sm font-semibold" style={{ color }}>{label}</p>
            </div>
          </div>

          {/* Factor breakdown */}
          <div className="space-y-1.5">
            {factors.map((factor, i) => (
              <motion.div
                key={factor.name}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.06]"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
              >
                <div className={`shrink-0 ${factor.impact === 'positive' ? 'text-green-400' : factor.impact === 'negative' ? 'text-red-400' : 'text-amber-400'}`}>
                  {factorIcons[factor.name]}
                </div>
                <span className="text-[11px] sm:text-xs text-white/70 flex-1">{factor.name}</span>
                <span className={`text-[11px] sm:text-xs font-semibold ${factor.impact === 'positive' ? 'text-green-400' : factor.impact === 'negative' ? 'text-red-300' : 'text-amber-300'}`}>
                  {factor.value}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ComfortCard;
