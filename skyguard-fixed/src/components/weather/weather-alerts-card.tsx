'use client';

import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Sun,
  Wind,
  Thermometer,
  AlertTriangle,
  Eye,
  Zap,
} from 'lucide-react';
import type { CurrentWeather, AirQualityData } from '@/lib/weather-types';

// ============================================================
// Props
// ============================================================

interface WeatherAlertsCardProps {
  weather: CurrentWeather;
  airQuality: AirQualityData;
}

// ============================================================
// Alert type definition
// ============================================================

interface WeatherAlert {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  severity: 'warning' | 'danger';
}

// ============================================================
// Determine active alerts
// ============================================================

function getActiveAlerts(weather: CurrentWeather, airQuality: AirQualityData): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // UV Alert: If UV index > 8
  if (weather.uvi > 8) {
    alerts.push({
      id: 'uv',
      icon: <Sun className="h-4 w-4 text-red-400" />,
      title: 'Extreme UV',
      description: 'Avoid sun exposure. Apply SPF 50+ sunscreen and wear protective clothing.',
      severity: 'danger',
    });
  }

  // High Wind Alert: If wind speed > 15 m/s
  if (weather.windSpeed > 15) {
    alerts.push({
      id: 'wind',
      icon: <Wind className="h-4 w-4 text-amber-400" />,
      title: 'High Wind Warning',
      description: `Wind speed ${weather.windSpeed} m/s. Secure loose objects and avoid open areas.`,
      severity: 'warning',
    });
  }

  // Extreme Temperature: If temp > 40°C or < 0°C
  if (weather.temp > 40) {
    alerts.push({
      id: 'heat',
      icon: <Thermometer className="h-4 w-4 text-red-400" />,
      title: 'Extreme Heat',
      description: `Temperature ${Math.round(weather.temp)}°C. Stay hydrated and avoid outdoor activities.`,
      severity: 'danger',
    });
  } else if (weather.temp < 0) {
    alerts.push({
      id: 'cold',
      icon: <Thermometer className="h-4 w-4 text-sky-400" />,
      title: 'Freezing Temperature',
      description: `Temperature ${Math.round(weather.temp)}°C. Watch for ice and dress warmly.`,
      severity: 'danger',
    });
  }

  // Poor AQI Alert: If AQI > 150
  if (!airQuality.unavailable && airQuality.aqi > 150) {
    alerts.push({
      id: 'aqi',
      icon: <AlertTriangle className="h-4 w-4 text-orange-400" />,
      title: 'Poor Air Quality',
      description: `AQI ${airQuality.aqi} (${airQuality.level.replace('-', ' ')}). Limit outdoor exposure and wear a mask.`,
      severity: 'danger',
    });
  }

  // Low Visibility: If visibility < 2000m
  if (weather.visibility < 2000) {
    alerts.push({
      id: 'visibility',
      icon: <Eye className="h-4 w-4 text-gray-400" />,
      title: 'Low Visibility',
      description: `Visibility ${weather.visibility >= 1000 ? `${(weather.visibility / 1000).toFixed(1)} km` : `${weather.visibility} m`}. Drive carefully and use fog lights.`,
      severity: 'warning',
    });
  }

  // Thunderstorm Alert: If condition is thunderstorm
  if (weather.condition === 'thunderstorm') {
    alerts.push({
      id: 'thunderstorm',
      icon: <Zap className="h-4 w-4 text-yellow-400" />,
      title: 'Thunderstorm Alert',
      description: 'Lightning detected. Seek shelter indoors and avoid tall structures.',
      severity: 'danger',
    });
  }

  return alerts;
}

// ============================================================
// Component
// ============================================================

export function WeatherAlertsCard({ weather, airQuality }: WeatherAlertsCardProps) {
  const alerts = getActiveAlerts(weather, airQuality);
  const noAlerts = alerts.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="skyguard-card skyguard-card-gradient skyguard-card-accent overflow-hidden">
        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className={`h-4 w-4 ${noAlerts ? 'text-emerald-400' : 'text-amber-400'}`} />
            <h3 className="text-xs sm:text-sm font-bold text-white/80">
              {noAlerts ? 'No Active Alerts' : `${alerts.length} Active Alert${alerts.length > 1 ? 's' : ''}`}
            </h3>
          </div>

          {noAlerts ? (
            /* No alerts state */
            <div className="flex items-center gap-3 py-2 px-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400">All Clear</p>
                <p className="text-[11px] text-white/55">No active weather alerts for your location</p>
              </div>
            </div>
          ) : (
            /* Alert list */
            <div className="flex flex-col gap-2">
              {alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl ${
                    alert.severity === 'danger'
                      ? 'bg-red-500/10 border border-red-500/20'
                      : 'bg-amber-500/10 border border-amber-500/20'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                    alert.severity === 'danger' ? 'bg-red-500/15' : 'bg-amber-500/15'
                  }`}>
                    {alert.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs sm:text-sm font-bold ${
                      alert.severity === 'danger' ? 'text-red-300' : 'text-amber-300'
                    }`}>
                      {alert.title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-white/60 leading-relaxed mt-0.5">
                      {alert.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default WeatherAlertsCard;
