'use client';

import { type WeatherCondition } from '@/lib/weather-types';

interface WeatherIconProps {
  condition: WeatherCondition;
  size?: number;
  className?: string;
}

// ============================================================
// CSS Keyframe Animations
// ============================================================
const animationStyles = `
@keyframes weather-spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes weather-spin-reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

@keyframes weather-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.08); }
}

@keyframes weather-drift-right {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(6px); }
}

@keyframes weather-drift-left {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-5px); }
}

@keyframes weather-rain-drop {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(14px); opacity: 0; }
}

@keyframes weather-rain-drop-delayed {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(12px); opacity: 0; }
}

@keyframes weather-mist-drop {
  0% { transform: translateY(0); opacity: 0.6; }
  100% { transform: translateY(8px); opacity: 0; }
}

@keyframes weather-lightning-flash {
  0%, 89%, 91%, 93%, 100% { opacity: 0; }
  90%, 92% { opacity: 1; }
}

@keyframes weather-snow-fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(14px) rotate(180deg); opacity: 0.3; }
}

@keyframes weather-snow-sway {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(3px); }
}

@keyframes weather-fog-wave {
  0%, 100% { transform: translateX(0) scaleY(1); opacity: 0.6; }
  50% { transform: translateX(4px) scaleY(1.15); opacity: 0.9; }
}

@keyframes weather-wind-blow {
  0% { transform: translateX(0) scaleX(1); opacity: 0.7; }
  50% { transform: translateX(6px) scaleX(1.05); opacity: 1; }
  100% { transform: translateX(0) scaleX(1); opacity: 0.7; }
}

@keyframes weather-sun-glow {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.4)); }
  50% { filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.7)); }
}
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const styleId = 'skyguard-weather-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = animationStyles;
    document.head.appendChild(style);
  }
}

// ============================================================
// SVG Icon Components
// ============================================================

function ClearIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Sun body */}
      <circle
        cx="50" cy="50" r="18"
        fill="#FBBF24"
        style={{ animation: 'weather-pulse 3s ease-in-out infinite' }}
      />
      <circle cx="50" cy="50" r="18" fill="url(#sunGradient)" />
      {/* Rotating rays group */}
      <g style={{ animation: 'weather-spin-slow 20s linear infinite', transformOrigin: '50px 50px' }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <line
            key={i}
            x1="50" y1="16" x2="50" y2="6"
            stroke="#FBBF24"
            strokeWidth="3.5"
            strokeLinecap="round"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </g>
      {/* Secondary rays (shorter, offset) */}
      <g style={{ animation: 'weather-spin-reverse 30s linear infinite', transformOrigin: '50px 50px' }}>
        {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle, i) => (
          <line
            key={i}
            x1="50" y1="20" x2="50" y2="12"
            stroke="#FCD34D"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </g>
      <defs>
        <radialGradient id="sunGradient" cx="45%" cy="40%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function PartlyCloudyIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Sun behind */}
      <g style={{ animation: 'weather-pulse 4s ease-in-out infinite' }}>
        <circle cx="36" cy="34" r="14" fill="url(#pcSunGrad)" />
        <g style={{ animation: 'weather-spin-slow 25s linear infinite', transformOrigin: '36px 34px' }}>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <line
              key={i}
              x1="36" y1="10" x2="36" y2="4"
              stroke="#FBBF24"
              strokeWidth="2.5"
              strokeLinecap="round"
              transform={`rotate(${angle} 36 34)`}
            />
          ))}
        </g>
      </g>
      {/* Cloud in front */}
      <g style={{ animation: 'weather-drift-right 5s ease-in-out infinite' }}>
        <ellipse cx="58" cy="54" rx="26" ry="14" fill="white" />
        <ellipse cx="46" cy="50" rx="16" ry="12" fill="white" />
        <ellipse cx="68" cy="52" rx="14" ry="10" fill="white" />
        <ellipse cx="55" cy="44" rx="14" ry="10" fill="#F3F4F6" />
      </g>
      <defs>
        <radialGradient id="pcSunGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function CloudyIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Back cloud */}
      <g style={{ animation: 'weather-drift-left 7s ease-in-out infinite' }}>
        <ellipse cx="44" cy="40" rx="22" ry="12" fill="#D1D5DB" />
        <ellipse cx="34" cy="38" rx="14" ry="10" fill="#D1D5DB" />
        <ellipse cx="54" cy="38" rx="12" ry="9" fill="#E5E7EB" />
        <ellipse cx="42" cy="33" rx="12" ry="8" fill="#E5E7EB" />
      </g>
      {/* Front cloud */}
      <g style={{ animation: 'weather-drift-right 6s ease-in-out infinite' }}>
        <ellipse cx="56" cy="58" rx="28" ry="16" fill="#F3F4F6" />
        <ellipse cx="42" cy="54" rx="18" ry="14" fill="white" />
        <ellipse cx="68" cy="56" rx="16" ry="11" fill="white" />
        <ellipse cx="52" cy="47" rx="16" ry="11" fill="#F9FAFB" />
      </g>
    </svg>
  );
}

function RainIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Cloud */}
      <g style={{ animation: 'weather-drift-right 6s ease-in-out infinite' }}>
        <ellipse cx="50" cy="38" rx="28" ry="14" fill="#9CA3AF" />
        <ellipse cx="36" cy="35" rx="16" ry="12" fill="#9CA3AF" />
        <ellipse cx="64" cy="36" rx="14" ry="10" fill="#A1A1AA" />
        <ellipse cx="48" cy="28" rx="14" ry="10" fill="#A1A1AA" />
      </g>
      {/* Rain drops */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={32 + i * 10}
          y1="54"
          x2={30 + i * 10}
          y2="66"
          stroke="#60A5FA"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            animation: `weather-rain-drop ${0.8 + i * 0.15}s ease-in infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      {/* Secondary drops */}
      {[0, 1, 2].map((i) => (
        <line
          key={`s${i}`}
          x1={38 + i * 12}
          y1="58"
          x2={36 + i * 12}
          y2="68"
          stroke="#93C5FD"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{
            animation: `weather-rain-drop-delayed ${0.9 + i * 0.1}s ease-in infinite`,
            animationDelay: `${0.3 + i * 0.25}s`,
          }}
        />
      ))}
    </svg>
  );
}

function DrizzleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Cloud */}
      <g style={{ animation: 'weather-drift-right 7s ease-in-out infinite' }}>
        <ellipse cx="50" cy="38" rx="26" ry="13" fill="#9CA3AF" />
        <ellipse cx="38" cy="35" rx="15" ry="11" fill="#A1A1AA" />
        <ellipse cx="62" cy="36" rx="13" ry="9" fill="#A1A1AA" />
        <ellipse cx="48" cy="28" rx="13" ry="9" fill="#A1A1AA" />
      </g>
      {/* Fine mist drops */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <circle
          key={i}
          cx={30 + i * 8}
          cy={56 + (i % 3) * 4}
          r="1.5"
          fill="#93C5FD"
          style={{
            animation: `weather-mist-drop ${1 + i * 0.15}s ease-in infinite`,
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
      {/* Extra fine drops */}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={`f${i}`}
          cx={34 + i * 9}
          cy={62 + (i % 2) * 3}
          r="1"
          fill="#BFDBFE"
          style={{
            animation: `weather-mist-drop ${1.2 + i * 0.1}s ease-in infinite`,
            animationDelay: `${0.5 + i * 0.2}s`,
          }}
        />
      ))}
    </svg>
  );
}

function ThunderstormIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Dark cloud */}
      <g style={{ animation: 'weather-drift-right 5s ease-in-out infinite' }}>
        <ellipse cx="50" cy="34" rx="28" ry="14" fill="#4B5563" />
        <ellipse cx="36" cy="31" rx="16" ry="12" fill="#4B5563" />
        <ellipse cx="64" cy="32" rx="14" ry="10" fill="#6B7280" />
        <ellipse cx="48" cy="24" rx="14" ry="10" fill="#6B7280" />
      </g>
      {/* Lightning bolt */}
      <polygon
        points="52,38 44,54 50,54 46,70 60,48 53,48 58,38"
        fill="#FBBF24"
        style={{ animation: 'weather-lightning-flash 4s ease-in-out infinite' }}
      />
      {/* Lightning glow */}
      <polygon
        points="52,38 44,54 50,54 46,70 60,48 53,48 58,38"
        fill="#FDE68A"
        opacity="0.5"
        style={{ animation: 'weather-lightning-flash 4s ease-in-out infinite', filter: 'blur(3px)' }}
      />
      {/* Rain with lightning */}
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1={34 + i * 12}
          y1="50"
          x2={32 + i * 12}
          y2="62"
          stroke="#60A5FA"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            animation: `weather-rain-drop ${0.7 + i * 0.1}s ease-in infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </svg>
  );
}

function SnowIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Cloud */}
      <g style={{ animation: 'weather-drift-right 8s ease-in-out infinite' }}>
        <ellipse cx="50" cy="34" rx="26" ry="13" fill="#D1D5DB" />
        <ellipse cx="38" cy="31" rx="15" ry="11" fill="#E5E7EB" />
        <ellipse cx="62" cy="32" rx="13" ry="9" fill="#E5E7EB" />
        <ellipse cx="48" cy="24" rx="13" ry="9" fill="#F3F4F6" />
      </g>
      {/* Snowflakes */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const cx = 30 + i * 9;
        const cy = 52 + (i % 3) * 6;
        return (
          <g
            key={i}
            style={{
              animation: `weather-snow-fall ${2 + i * 0.3}s ease-in-out infinite, weather-snow-sway ${3 + i * 0.2}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            {/* Six-pointed snowflake */}
            {[0, 60, 120].map((angle, j) => (
              <line
                key={j}
                x1={cx} y1={cy - 4} x2={cx} y2={cy + 4}
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                transform={`rotate(${angle} ${cx} ${cy})`}
              />
            ))}
          </g>
        );
      })}
      {/* Smaller dots */}
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={`d${i}`}
          cx={35 + i * 10}
          cy={66 + (i % 2) * 5}
          r="1.5"
          fill="white"
          style={{
            animation: `weather-snow-fall ${2.5 + i * 0.2}s ease-in-out infinite`,
            animationDelay: `${0.8 + i * 0.3}s`,
          }}
        />
      ))}
    </svg>
  );
}

function FogIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Fog lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${18 + i * 2},${32 + i * 12} Q${30 + i},${28 + i * 12} ${42 + i * 2},${32 + i * 12} Q${54 + i},${36 + i * 12} ${66 + i * 2},${32 + i * 12} Q${74 + i},${29 + i * 12} ${82},${32 + i * 12}`}
          stroke="#9CA3AF"
          strokeWidth={3.5 - i * 0.3}
          strokeLinecap="round"
          fill="none"
          style={{
            animation: `weather-fog-wave ${3 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
            opacity: 0.5 + i * 0.1,
          }}
        />
      ))}
    </svg>
  );
}

function WindyIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Wind lines */}
      <path
        d="M15,38 Q30,34 45,38 Q55,41 60,36 Q65,30 72,34"
        stroke="#9CA3AF"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        style={{ animation: 'weather-wind-blow 2.5s ease-in-out infinite' }}
      />
      <path
        d="M20,50 Q38,46 52,50 Q62,53 68,48 Q75,42 82,46"
        stroke="#6B7280"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        style={{ animation: 'weather-wind-blow 3s ease-in-out infinite', animationDelay: '0.5s' }}
      />
      <path
        d="M12,62 Q28,58 44,62 Q54,65 62,60 Q70,54 78,58"
        stroke="#9CA3AF"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        style={{ animation: 'weather-wind-blow 2.8s ease-in-out infinite', animationDelay: '1s' }}
      />
      {/* Small trailing lines */}
      <path
        d="M68,34 Q74,30 80,34"
        stroke="#D1D5DB"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        style={{ animation: 'weather-wind-blow 2s ease-in-out infinite', animationDelay: '0.3s' }}
      />
    </svg>
  );
}

// ============================================================
// Main WeatherIcon Component
// ============================================================

const iconMap: Record<WeatherCondition, React.FC<{ size: number }>> = {
  clear: ClearIcon,
  'partly-cloudy': PartlyCloudyIcon,
  cloudy: CloudyIcon,
  rain: RainIcon,
  drizzle: DrizzleIcon,
  thunderstorm: ThunderstormIcon,
  snow: SnowIcon,
  fog: FogIcon,
  windy: WindyIcon,
};

export function WeatherIcon({ condition, size = 64, className }: WeatherIconProps) {
  const IconComponent = iconMap[condition];

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        animation: 'weather-sun-glow 4s ease-in-out infinite',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="img"
      aria-label={condition.replace('-', ' ')}
    >
      <IconComponent size={size} />
    </div>
  );
}

export default WeatherIcon;
