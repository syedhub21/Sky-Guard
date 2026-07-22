'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WeatherCondition } from '@/lib/weather-types';

interface AnimatedBackgroundProps {
  condition: WeatherCondition;
  isDaytime?: boolean;
}

// ============================================================
// Gradient configs — bright sky-like DAY gradients vs deep dark NIGHT
// gradients. The day/night difference is intentionally obvious so
// the background clearly reflects the searched location's local time.
// White text + dark text-shadow (in globals.css) stays readable on both.
// ============================================================
interface GradientConfig {
  day: string;
  night: string;
}

const GRADIENTS: Record<WeatherCondition, GradientConfig> = {
  clear: {
    day: 'linear-gradient(180deg, #1e6fc4 0%, #2d86da 25%, #3d9ef0 50%, #52b4f5 75%, #2d86da 100%)',
    night: 'linear-gradient(180deg, #020810 0%, #0a1628 30%, #0f1f3d 65%, #162447 100%)',
  },
  'partly-cloudy': {
    day: 'linear-gradient(180deg, #2c7ab0 0%, #4a90c4 25%, #6aa6d4 50%, #8abae4 75%, #4a90c4 100%)',
    night: 'linear-gradient(180deg, #080e18 0%, #0d1b2a 40%, #1a2332 70%, #1e2d3d 100%)',
  },
  cloudy: {
    day: 'linear-gradient(180deg, #6b7c8c 0%, #7e8f9e 25%, #91a2b0 50%, #a4b5c2 75%, #7e8f9e 100%)',
    night: 'linear-gradient(180deg, #080c12 0%, #111820 40%, #1a2332 70%, #232d3a 100%)',
  },
  rain: {
    day: 'linear-gradient(180deg, #5a6b7b 0%, #6c7d8d 25%, #7e8f9f 50%, #90a1b1 75%, #6c7d8d 100%)',
    night: 'linear-gradient(180deg, #050810 0%, #0a1018 30%, #0f1824 60%, #142030 100%)',
  },
  thunderstorm: {
    day: 'linear-gradient(180deg, #4a5565 0%, #5a6575 25%, #6a7585 50%, #7a8595 75%, #5a6575 100%)',
    night: 'linear-gradient(180deg, #030508 0%, #080c14 25%, #0d1320 50%, #121a28 100%)',
  },
  snow: {
    day: 'linear-gradient(180deg, #6889a9 0%, #809ec0 25%, #98b3d7 50%, #b0c8ee 75%, #809ec0 100%)',
    night: 'linear-gradient(180deg, #080e1a 0%, #0f1828 25%, #162040 50%, #1c2850 75%, #182448 100%)',
  },
  fog: {
    day: 'linear-gradient(180deg, #7a8690 0%, #8c98a2 25%, #9eaab4 50%, #b0bcc6 75%, #8c98a2 100%)',
    night: 'linear-gradient(180deg, #0a0e14 0%, #141a22 30%, #1a222a 55%, #202830 80%, #1a2228 100%)',
  },
  windy: {
    day: 'linear-gradient(180deg, #2c8bb8 0%, #4a9fc8 25%, #68b3d8 50%, #86c7e8 75%, #4a9fc8 100%)',
    night: 'linear-gradient(180deg, #060c18 0%, #0a1628 30%, #0f1f38 60%, #142848 100%)',
  },
  drizzle: {
    day: 'linear-gradient(180deg, #61718a 0%, #73849d 25%, #8596b0 50%, #97a8c3 75%, #73849d 100%)',
    night: 'linear-gradient(180deg, #070a10 0%, #0c1520 30%, #121e2e 60%, #182838 100%)',
  },
};

// ============================================================
// Particle generation helpers (deterministic via seed)
// ============================================================
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================================
// Particle component generators
// ============================================================

function SunRays({ isDaytime }: { isDaytime: boolean }) {
  const rays = useMemo(() => {
    const rand = seededRandom(42);
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      rotation: i * 45,
      delay: i * 0.2,
      opacity: 0.1 + rand() * 0.12,
      width: 1.5 + rand() * 2,
    }));
  }, []);

  if (!isDaytime) return null;

  return (
    <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px]">
      {/* Sun glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,236,179,0.35) 0%, rgba(255,183,77,0.12) 40%, transparent 70%)',
          animation: 'sunPulse 5s ease-in-out infinite',
        }}
      />
      {/* Sun core */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,249,196,0.45) 0%, rgba(255,224,130,0.2) 50%, transparent 100%)',
          boxShadow: '0 0 30px rgba(255,183,77,0.2), 0 0 60px rgba(255,152,0,0.08)',
          animation: 'sunCorePulse 4s ease-in-out infinite',
        }}
      />
      {/* Rays */}
      {rays.map((ray) => (
        <div
          key={ray.id}
          className="absolute top-0 left-1/2 origin-top"
          style={{
            transform: `rotate(${ray.rotation}deg)`,
            width: `${ray.width}px`,
            height: '160px',
            marginLeft: `-${ray.width / 2}px`,
            background: `linear-gradient(180deg, rgba(255,224,130,${ray.opacity * 0.25}) 0%, transparent 100%)`,
            animation: `rayPulse 5s ease-in-out ${ray.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function LightParticles({ isDaytime }: { isDaytime: boolean }) {
  const particles = useMemo(() => {
    const rand = seededRandom(123);
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: rand() * 100,
      y: rand() * 100,
      size: 1.5 + rand() * 2,
      duration: 8 + rand() * 10,
      delay: rand() * 5,
      opacity: 0.08 + rand() * 0.12,
    }));
  }, []);

  return (
    <>
      {particles.map((p) => (
        <div
          key={`light-${p.id}`}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: isDaytime
              ? `rgba(200,220,255,${p.opacity})`
              : `rgba(150,170,220,${p.opacity * 0.5})`,
            animation: `floatUp ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}

function Stars() {
  const stars = useMemo(() => {
    const rand = seededRandom(777);
    return Array.from({ length: 35 }, (_, i) => ({
      id: i,
      x: rand() * 100,
      y: rand() * 100,
      size: 0.8 + rand() * 1.5,
      duration: 3 + rand() * 5,
      delay: rand() * 3,
      opacity: 0.2 + rand() * 0.5,
    }));
  }, []);

  return (
    <>
      {stars.map((s) => (
        <div
          key={`star-${s.id}`}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: '#C5CAE9',
            boxShadow: `0 0 ${s.size * 2}px rgba(197,202,233,0.4)`,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}

function RainDrops({ heavy = false }: { heavy?: boolean }) {
  const drops = useMemo(() => {
    const count = heavy ? 50 : 25;
    const rand = seededRandom(heavy ? 200 : 300);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand() * 100,
      duration: heavy ? 0.5 + rand() * 0.5 : 0.8 + rand() * 0.8,
      delay: rand() * 2,
      height: heavy ? 14 + rand() * 16 : 8 + rand() * 10,
      width: heavy ? 1.2 : 0.8,
      opacity: 0.15 + rand() * 0.25,
      windOffset: heavy ? rand() * 3 : rand() * 1.5,
    }));
  }, [heavy]);

  return (
    <>
      {drops.map((d) => (
        <div
          key={`rain-${d.id}`}
          className="absolute top-0"
          style={{
            left: `${d.x}%`,
            width: `${d.width}px`,
            height: `${d.height}px`,
            background: `linear-gradient(180deg, transparent 0%, rgba(150,190,220,${d.opacity}) 100%)`,
            borderRadius: '0 0 2px 2px',
            animation: `rainFall ${d.duration}s linear ${d.delay}s infinite`,
            transform: `translateX(${d.windOffset}px)`,
          }}
        />
      ))}
    </>
  );
}

function Snowflakes() {
  const flakes = useMemo(() => {
    const rand = seededRandom(400);
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: rand() * 100,
      size: 2 + rand() * 4,
      duration: 7 + rand() * 12,
      delay: rand() * 5,
      opacity: 0.2 + rand() * 0.35,
      drift: -10 + rand() * 20,
      driftDuration: 4 + rand() * 5,
    }));
  }, []);

  return (
    <>
      {flakes.map((f) => (
        <div
          key={`snow-${f.id}`}
          className="absolute top-0"
          style={{
            left: `${f.x}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 60%, transparent 100%)',
            borderRadius: '50%',
            animation: [
              `snowFall ${f.duration}s linear ${f.delay}s infinite`,
              `snowDrift ${f.driftDuration}s ease-in-out ${f.delay}s infinite`,
            ].join(', '),
            '--drift': `${f.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

function Lightning() {
  const flashes = useMemo(() => {
    const rand = seededRandom(500);
    return Array.from({ length: 3 }, (_, i) => ({
      id: i,
      delay: 3 + i * 4 + rand() * 2,
      duration: 0.15 + rand() * 0.1,
    }));
  }, []);

  return (
    <>
      {flashes.map((f) => (
        <div
          key={`lightning-${f.id}`}
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.6) 0%, rgba(180,200,255,0.2) 40%, transparent 70%)',
            animation: `lightningFlash 7s ease-in-out ${f.delay}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
      {/* Lightning bolt shapes */}
      {flashes.map((f) => (
        <svg
          key={`bolt-${f.id}`}
          className="absolute"
          style={{
            top: '5%',
            left: `${20 + f.id * 30}%`,
            width: '30px',
            height: '150px',
            animation: `lightningFlash 7s ease-in-out ${f.delay}s infinite`,
            filter: 'drop-shadow(0 0 15px rgba(180,200,255,0.6))',
          }}
          viewBox="0 0 40 200"
        >
          <path
            d="M20 0 L10 80 L22 80 L8 200 L30 100 L18 100 L30 0 Z"
            fill="rgba(255,255,240,0.7)"
          />
        </svg>
      ))}
    </>
  );
}

function Clouds({ count = 5, dark = false }: { count?: number; dark?: boolean }) {
  const clouds = useMemo(() => {
    const rand = seededRandom(600);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: -20 + rand() * 100,
      y: 5 + rand() * 40,
      scale: 0.5 + rand() * 0.6,
      duration: 30 + rand() * 40,
      delay: rand() * 10,
      opacity: dark ? 0.3 + rand() * 0.2 : 0.3 + rand() * 0.3,
    }));
  }, [count, dark]);

  return (
    <>
      {clouds.map((c) => (
        <div
          key={`cloud-${c.id}`}
          className="absolute"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            transform: `scale(${c.scale})`,
            opacity: c.opacity,
            animation: `cloudDrift ${c.duration}s linear ${c.delay}s infinite`,
          }}
        >
          <svg width="160" height="80" viewBox="0 0 200 100">
            <ellipse cx="70" cy="60" rx="60" ry="35" fill={dark ? '#37474F' : '#455A64'} />
            <ellipse cx="110" cy="55" rx="50" ry="30" fill={dark ? '#455A64' : '#546E7A'} />
            <ellipse cx="90" cy="45" rx="45" ry="35" fill={dark ? '#2D3748' : '#37474F'} />
            <ellipse cx="50" cy="55" rx="35" ry="25" fill={dark ? '#455A64' : '#546E7A'} />
            <ellipse cx="130" cy="60" rx="30" ry="22" fill={dark ? '#37474F' : '#455A64'} />
          </svg>
        </div>
      ))}
    </>
  );
}

function FogLayers() {
  const layers = useMemo(() => {
    const rand = seededRandom(700);
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      y: 10 + i * 12,
      height: 15 + rand() * 20,
      duration: 15 + rand() * 20,
      delay: rand() * 8,
      opacity: 0.08 + rand() * 0.12,
      direction: i % 2 === 0 ? 1 : -1,
    }));
  }, []);

  return (
    <>
      {layers.map((l) => (
        <div
          key={`fog-${l.id}`}
          className="absolute w-[200%]"
          style={{
            top: `${l.y}%`,
            height: `${l.height}%`,
            background: `linear-gradient(90deg, transparent 0%, rgba(150,170,190,${l.opacity}) 20%, rgba(170,185,200,${l.opacity * 1.3}) 50%, rgba(150,170,190,${l.opacity}) 80%, transparent 100%)`,
            animation: `fogDrift${l.direction > 0 ? 'Right' : 'Left'} ${l.duration}s ease-in-out ${l.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}

function WindStreaks() {
  const streaks = useMemo(() => {
    const rand = seededRandom(800);
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      y: rand() * 100,
      width: 30 + rand() * 70,
      height: 0.8 + rand() * 1,
      duration: 1.5 + rand() * 2.5,
      delay: rand() * 3,
      opacity: 0.06 + rand() * 0.12,
    }));
  }, []);

  return (
    <>
      {streaks.map((s) => (
        <div
          key={`wind-${s.id}`}
          className="absolute"
          style={{
            top: `${s.y}%`,
            left: `-${s.width}px`,
            width: `${s.width}px`,
            height: `${s.height}px`,
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,${s.opacity}) 40%, rgba(255,255,255,${s.opacity * 0.5}) 100%)`,
            borderRadius: '2px',
            animation: `windStreak ${s.duration}s linear ${s.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}

// ============================================================
// Condition-specific scene renderer
// ============================================================
function WeatherScene({ condition, isDaytime }: AnimatedBackgroundProps) {
  switch (condition) {
    case 'clear':
      return (
        <>
          {isDaytime ? <SunRays isDaytime /> : <Stars />}
          <LightParticles isDaytime={isDaytime} />
        </>
      );

    case 'partly-cloudy':
      return (
        <>
          {isDaytime ? <SunRays isDaytime /> : <Stars />}
          <Clouds count={3} dark />
          <LightParticles isDaytime={isDaytime} />
        </>
      );

    case 'cloudy':
      return (
        <>
          {isDaytime ? <LightParticles isDaytime /> : <Stars />}
          <Clouds count={5} dark />
        </>
      );

    case 'rain':
      return (
        <>
          <RainDrops heavy />
          <Clouds count={3} dark />
        </>
      );

    case 'drizzle':
      return (
        <>
          <RainDrops heavy={false} />
          <Clouds count={2} dark />
        </>
      );

    case 'thunderstorm':
      return (
        <>
          <RainDrops heavy />
          <Lightning />
          <Clouds count={4} dark />
        </>
      );

    case 'snow':
      return (
        <>
          <Snowflakes />
          {!isDaytime && <Stars />}
          <Clouds count={2} dark />
        </>
      );

    case 'fog':
      return (
        <>
          <FogLayers />
          {!isDaytime && <Stars />}
        </>
      );

    case 'windy':
      return (
        <>
          <WindStreaks />
          {isDaytime ? <LightParticles isDaytime /> : <Stars />}
          <Clouds count={2} dark />
        </>
      );

    default:
      return null;
  }
}

// ============================================================
// Main component
// ============================================================
export function AnimatedBackground({ condition, isDaytime = true }: AnimatedBackgroundProps) {
  const gradient = GRADIENTS[condition]?.[isDaytime ? 'day' : 'night'] ?? GRADIENTS.clear.day;

  return (
    <>
      {/* Inject keyframe animations */}
      <style>{`
        /* Sun animations */
        @keyframes sunPulse {
          0%, 100% { transform: translateX(-50%) translateY(-50%) scale(1); opacity: 0.6; }
          50% { transform: translateX(-50%) translateY(-50%) scale(1.12); opacity: 0.9; }
        }
        @keyframes sunCorePulse {
          0%, 100% { transform: translateX(-50%) translateY(-50%) scale(1); }
          50% { transform: translateX(-50%) translateY(-50%) scale(1.08); }
        }
        @keyframes rayPulse {
          0%, 100% { opacity: 0.2; transform: scaleY(1); }
          50% { opacity: 0.5; transform: scaleY(1.1); }
        }

        /* Floating particles */
        @keyframes floatUp {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) translateX(15px); opacity: 0; }
        }

        /* Stars twinkling */
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.15); }
        }

        /* Rain */
        @keyframes rainFall {
          0% { transform: translateY(-100vh) translateX(0); opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 0.5; }
          100% { transform: translateY(105vh) translateX(-8px); opacity: 0; }
        }

        /* Snow */
        @keyframes snowFall {
          0% { transform: translateY(-10vh); opacity: 0; }
          5% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(110vh); opacity: 0; }
        }
        @keyframes snowDrift {
          0%, 100% { margin-left: 0; }
          50% { margin-left: var(--drift, 15px); }
        }

        /* Lightning */
        @keyframes lightningFlash {
          0%, 89%, 91%, 93%, 100% { opacity: 0; }
          90% { opacity: 1; }
          92% { opacity: 0.5; }
        }

        /* Clouds */
        @keyframes cloudDrift {
          0% { transform: translateX(0) scale(var(--cloud-scale, 1)); }
          100% { transform: translateX(100vw) scale(var(--cloud-scale, 1)); }
        }

        /* Fog */
        @keyframes fogDriftRight {
          0%, 100% { transform: translateX(-30%); }
          50% { transform: translateX(0%); }
        }
        @keyframes fogDriftLeft {
          0%, 100% { transform: translateX(0%); }
          50% { transform: translateX(-30%); }
        }

        /* Wind streaks */
        @keyframes windStreak {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.5; }
          100% { transform: translateX(calc(100vw + 150px)); opacity: 0; }
        }
      `}</style>

      {/* Background layer with gradient transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${condition}-${isDaytime ? 'day' : 'night'}`}
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ background: gradient }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        >
          {/* Weather particles with their own transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={condition}
              className="absolute inset-0 overflow-hidden pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            >
              <WeatherScene condition={condition} isDaytime={isDaytime} />
            </motion.div>
          </AnimatePresence>

          {/* Vignette for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.2) 100%)',
            }}
          />

          {/* Bottom fade for content readability */}
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: '30%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.15) 100%)',
            }}
          />
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export default AnimatedBackground;
