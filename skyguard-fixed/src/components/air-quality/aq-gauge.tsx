'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { getAQILevel } from '@/lib/weather-types';

// AQI zone definitions for the gauge track
const AQI_ZONES = [
  { min: 0, max: 50, color: '#22c55e', label: 'Good' },
  { min: 51, max: 100, color: '#eab308', label: 'Moderate' },
  { min: 101, max: 150, color: '#f97316', label: 'Unhealthy (SG)' },
  { min: 151, max: 200, color: '#ef4444', label: 'Unhealthy' },
  { min: 201, max: 300, color: '#a855f7', label: 'Very Unhealthy' },
  { min: 301, max: 400, color: '#991b1b', label: 'Hazardous' },
  { min: 401, max: 500, color: '#7f1d1d', label: 'Very Hazardous' },
];

interface AqGaugeProps {
  aqi: number;
  color: string;
  size?: number;
}

export default function AqGauge({ aqi, color, size = 160 }: AqGaugeProps) {
  const [displayAqi, setDisplayAqi] = useState(0);

  // Arc configuration: 270-degree arc
  const startAngle = 135; // degrees from 3 o'clock position
  const endAngle = 405; // 135 + 270
  const totalAngle = endAngle - startAngle; // 270 degrees

  // SVG center and radius
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 20;
  const strokeWidth = 14;
  const trackWidth = 14;

  // Convert angle to SVG coordinates
  const polarToCartesian = (
    centerX: number,
    centerY: number,
    r: number,
    angleDeg: number
  ) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: centerX + r * Math.cos(angleRad),
      y: centerY + r * Math.sin(angleRad),
    };
  };

  // Create SVG arc path
  const describeArc = (
    centerX: number,
    centerY: number,
    r: number,
    startAng: number,
    endAng: number
  ) => {
    const start = polarToCartesian(centerX, centerY, r, endAng);
    const end = polarToCartesian(centerX, centerY, r, startAng);
    const largeArcFlag = endAng - startAng > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  // Calculate AQI position on arc (0-500 mapped to 0-270 degrees)
  const clampedAqi = Math.min(Math.max(aqi, 0), 500);
  const aqiAngle = startAngle + (clampedAqi / 500) * totalAngle;

  // Generate zone arc segments
  const zoneArcs = AQI_ZONES.map((zone) => {
    const zoneStartAngle =
      startAngle + (zone.min / 500) * totalAngle;
    const zoneEndAngle =
      startAngle + (zone.max / 500) * totalAngle;
    return {
      ...zone,
      path: describeArc(cx, cy, radius, zoneStartAngle, zoneEndAngle),
      startAngle: zoneStartAngle,
      endAngle: zoneEndAngle,
    };
  });

  // Filled arc (current AQI value)
  const filledArcPath = describeArc(cx, cy, radius, startAngle, aqiAngle);

  // Needle tip position
  const needleTip = polarToCartesian(cx, cy, radius - 4, aqiAngle);

  // Glow position
  const glowPos = polarToCartesian(cx, cy, radius, aqiAngle);

  // Animated counter for AQI number
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const roundedAqi = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    spring.set(clampedAqi);
  }, [clampedAqi, spring]);

  useEffect(() => {
    const unsubscribe = roundedAqi.on('change', (v) => {
      setDisplayAqi(v);
    });
    return unsubscribe;
  }, [roundedAqi]);

  // Level label
  const level = getAQILevel(aqi);
  const levelLabels: Record<string, string> = {
    good: 'Good',
    moderate: 'Moderate',
    'unhealthy-sensitive': 'Unhealthy*',
    unhealthy: 'Unhealthy',
    'very-unhealthy': 'Very Unhealthy',
    hazardous: 'Hazardous',
    'very-hazardous': 'Very Hazardous',
  };

  // Unique gradient IDs
  const gradientId = `gauge-grad-${Math.random().toString(36).slice(2, 8)}`;
  const glowId = `gauge-glow-${Math.random().toString(36).slice(2, 8)}`;
  const shadowId = `gauge-shadow-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-sm"
      >
        <defs>
          {/* Gradient for the filled arc */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={AQI_ZONES[0].color} />
            <stop offset="20%" stopColor={AQI_ZONES[1].color} />
            <stop offset="40%" stopColor={AQI_ZONES[2].color} />
            <stop offset="60%" stopColor={AQI_ZONES[3].color} />
            <stop offset="80%" stopColor={AQI_ZONES[4].color} />
            <stop offset="83%" stopColor={AQI_ZONES[5].color} />
            <stop offset="100%" stopColor={AQI_ZONES[6].color} />
          </linearGradient>

          {/* Glow filter */}
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Drop shadow filter */}
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Background track (gray) */}
        <path
          d={describeArc(cx, cy, radius, startAngle, endAngle)}
          fill="none"
          stroke="currentColor"
          strokeWidth={trackWidth}
          className="text-white/10"
          strokeLinecap="round"
        />

        {/* Zone color segments */}
        {zoneArcs.map((zone, i) => (
          <path
            key={i}
            d={zone.path}
            fill="none"
            stroke={zone.color}
            strokeWidth={trackWidth - 2}
            opacity={0.25}
            strokeLinecap={i === 0 || i === zoneArcs.length - 1 ? 'round' : 'butt'}
          />
        ))}

        {/* Filled arc (animated) */}
        <motion.path
          d={filledArcPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          filter={`url(#${shadowId})`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        {/* Glow dot at current position */}
        <motion.circle
          cx={glowPos.x}
          cy={glowPos.y}
          r={8}
          fill={color}
          filter={`url(#${glowId})`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.7 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        />

        {/* Needle indicator */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.8}
          />
          <circle
            cx={needleTip.x}
            cy={needleTip.y}
            r={5}
            fill={color}
            stroke="white"
            strokeWidth={2}
          />
          {/* Center dot */}
          <circle cx={cx} cy={cy} r={4} fill="white" opacity={0.9} />
          <circle cx={cx} cy={cy} r={2.5} fill={color} />
        </motion.g>

        {/* Tick marks */}
        {AQI_ZONES.map((zone, i) => {
          const tickAngle =
            startAngle + (zone.min / 500) * totalAngle;
          const tickOuter = polarToCartesian(cx, cy, radius + 10, tickAngle);
          const tickInner = polarToCartesian(cx, cy, radius + 4, tickAngle);
          return (
            <line
              key={`tick-${i}`}
              x1={tickInner.x}
              y1={tickInner.y}
              x2={tickOuter.x}
              y2={tickOuter.y}
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.3}
              className="text-white/30"
            />
          );
        })}

        {/* End tick */}
        {(() => {
          const endTick = polarToCartesian(cx, cy, radius + 10, endAngle);
          const endTickInner = polarToCartesian(cx, cy, radius + 4, endAngle);
          return (
            <line
              x1={endTickInner.x}
              y1={endTickInner.y}
              x2={endTick.x}
              y2={endTick.y}
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.3}
              className="text-white/30"
            />
          );
        })()}

        {/* AQI number in center */}
        <motion.text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-bold"
          fill={color}
          fontSize={size * 0.19}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {displayAqi}
        </motion.text>

        {/* Level label */}
        <motion.text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          className="text-white/70 font-medium"
          fontSize={size * 0.065}
          opacity={0.7}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          {levelLabels[level] || level}
        </motion.text>

        {/* "AQI" label */}
        <motion.text
          x={cx}
          y={cy + 34}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          className="text-white/40"
          fontSize={size * 0.05}
          opacity={0.5}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.4, delay: 1 }}
        >
          AQI
        </motion.text>
      </svg>
    </div>
  );
}
