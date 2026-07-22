'use client';

import { useRef, useEffect, useState } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';

// ============================================================
// Major world cities shown as clickable markers on the globe
// ============================================================
interface CityPoint {
  lat: number;
  lng: number;
  name: string;
  country: string;
}

const CITIES: CityPoint[] = [
  { name: 'New York', country: 'US', lat: 40.71, lng: -74.01 },
  { name: 'Los Angeles', country: 'US', lat: 34.05, lng: -118.24 },
  { name: 'Chicago', country: 'US', lat: 41.88, lng: -87.63 },
  { name: 'Toronto', country: 'CA', lat: 43.65, lng: -79.38 },
  { name: 'Mexico City', country: 'MX', lat: 19.43, lng: -99.13 },
  { name: 'São Paulo', country: 'BR', lat: -23.55, lng: -46.63 },
  { name: 'Rio de Janeiro', country: 'BR', lat: -22.91, lng: -43.17 },
  { name: 'Buenos Aires', country: 'AR', lat: -34.6, lng: -58.38 },
  { name: 'Lima', country: 'PE', lat: -12.05, lng: -77.04 },
  { name: 'Bogotá', country: 'CO', lat: 4.71, lng: -74.07 },
  { name: 'London', country: 'GB', lat: 51.51, lng: -0.13 },
  { name: 'Paris', country: 'FR', lat: 48.85, lng: 2.35 },
  { name: 'Berlin', country: 'DE', lat: 52.52, lng: 13.4 },
  { name: 'Madrid', country: 'ES', lat: 40.42, lng: -3.7 },
  { name: 'Rome', country: 'IT', lat: 41.9, lng: 12.5 },
  { name: 'Amsterdam', country: 'NL', lat: 52.37, lng: 4.9 },
  { name: 'Stockholm', country: 'SE', lat: 59.33, lng: 18.07 },
  { name: 'Athens', country: 'GR', lat: 37.98, lng: 23.73 },
  { name: 'Moscow', country: 'RU', lat: 55.76, lng: 37.62 },
  { name: 'Istanbul', country: 'TR', lat: 41.01, lng: 28.98 },
  { name: 'Cairo', country: 'EG', lat: 30.04, lng: 31.24 },
  { name: 'Casablanca', country: 'MA', lat: 33.57, lng: -7.59 },
  { name: 'Lagos', country: 'NG', lat: 6.52, lng: 3.38 },
  { name: 'Nairobi', country: 'KE', lat: -1.29, lng: 36.82 },
  { name: 'Johannesburg', country: 'ZA', lat: -26.2, lng: 28.05 },
  { name: 'Dubai', country: 'AE', lat: 25.2, lng: 55.27 },
  { name: 'Tehran', country: 'IR', lat: 35.69, lng: 51.39 },
  { name: 'Mumbai', country: 'IN', lat: 19.08, lng: 72.88 },
  { name: 'Delhi', country: 'IN', lat: 28.65, lng: 77.21 },
  { name: 'Kolkata', country: 'IN', lat: 22.57, lng: 88.36 },
  { name: 'Bangkok', country: 'TH', lat: 13.76, lng: 100.5 },
  { name: 'Singapore', country: 'SG', lat: 1.35, lng: 103.82 },
  { name: 'Jakarta', country: 'ID', lat: -6.21, lng: 106.85 },
  { name: 'Hong Kong', country: 'HK', lat: 22.32, lng: 114.17 },
  { name: 'Manila', country: 'PH', lat: 14.6, lng: 120.98 },
  { name: 'Shanghai', country: 'CN', lat: 31.23, lng: 121.47 },
  { name: 'Beijing', country: 'CN', lat: 39.9, lng: 116.41 },
  { name: 'Seoul', country: 'KR', lat: 37.57, lng: 126.98 },
  { name: 'Tokyo', country: 'JP', lat: 35.68, lng: 139.65 },
  { name: 'Sydney', country: 'AU', lat: -33.87, lng: 151.21 },
  { name: 'Melbourne', country: 'AU', lat: -37.81, lng: 144.96 },
  { name: 'Auckland', country: 'NZ', lat: -36.85, lng: 174.76 },
];

// Ring data (same cities) for the animated pulsing rings
interface RingPoint extends CityPoint {
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
}

const RINGS: RingPoint[] = CITIES.map((c) => ({
  ...c,
  maxR: 4,
  propagationSpeed: 1.5,
  repeatPeriod: 2200,
}));

interface WeatherGlobeProps {
  onSelect: (lat: number, lon: number, name: string, country: string) => void;
}

export function WeatherGlobe({ onSelect }: WeatherGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(320);
  const [hovered, setHovered] = useState<CityPoint | null>(null);
  const [selected, setSelected] = useState<CityPoint | null>(null);

  // Responsive sizing — keep it a square that fits the viewport
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const dim = Math.min(vw - 32, 420);
      setSize(dim);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Configure globe once mounted: gentle auto-rotation + camera angle
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);
    const controls = g.controls() as unknown as {
      autoRotate: boolean;
      autoRotateSpeed: number;
      enableZoom: boolean;
      enablePan: boolean;
    };
    // Slow, gentle rotation so markers are easy to tap
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;
    controls.enableZoom = false;
    controls.enablePan = false;
  }, []);

  // Pause auto-rotation while the user hovers a marker, so it's easy to click
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls() as unknown as { autoRotate: boolean };
    controls.autoRotate = !hovered && !selected;
  }, [hovered, selected]);

  // Marker colour — warm amber, brightens on hover/selection
  const pointColor = (d: object): string => {
    const city = d as CityPoint;
    if (selected && city.name === selected.name) return '#fef3c7';
    if (hovered && city.name === hovered.name) return '#fcd34d';
    return '#fbbf24';
  };

  // Larger markers so they're easy to tap on touchscreens
  const pointRadius = (d: object): number => {
    const city = d as CityPoint;
    if (selected && city.name === selected.name) return 0.6;
    if (hovered && city.name === hovered.name) return 0.52;
    return 0.42;
  };

  // Click handler — smooth camera fly-to, then trigger weather fetch
  const handlePointClick = (d: object): void => {
    const city = d as CityPoint;
    setSelected(city);
    const g = globeRef.current;
    if (g) {
      g.pointOfView({ lat: city.lat, lng: city.lng, altitude: 1.6 }, 1200);
      const controls = g.controls() as unknown as { autoRotate: boolean };
      controls.autoRotate = false;
    }
    setTimeout(() => onSelect(city.lat, city.lng, city.name, city.country), 700);
  };

  // Hover tooltip HTML
  const pointLabel = (d: object): string => {
    const city = d as CityPoint;
    return `
      <div style="
        background: rgba(15,27,46,0.92);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 0.6rem;
        padding: 0.35rem 0.7rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: #fff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        white-space: nowrap;
        pointer-events: none;
      ">
        ${city.name}<span style="opacity:0.6;font-weight:400">, ${city.country}</span>
      </div>
    `;
  };

  const ringColor = (): string => 'rgba(251,191,36,0.5)';

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Globe
        ref={globeRef}
        width={size}
        height={size}
        // Earth surface + terrain relief — NO starry background image,
        // so the page's animated sky shows through seamlessly.
        globeImageUrl="/globe/earth-blue-marble.jpg"
        bumpImageUrl="/globe/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#93c5fd"
        atmosphereAltitude={0.2}
        // City markers — large enough to tap easily
        pointsData={CITIES}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.01}
        pointRadius={pointRadius}
        pointColor={pointColor}
        pointResolution={24}
        pointLabel={pointLabel}
        onPointClick={handlePointClick}
        onPointHover={(d: object | null) => setHovered((d as CityPoint) ?? null)}
        // Animated pulsing rings
        ringsData={RINGS}
        ringLat="lat"
        ringLng="lng"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringColor={ringColor}
        ringAltitude={0.01}
        // Transparent renderer so the page background blends through
        rendererConfig={{ antialias: true, alpha: true }}
      />
      {/* Hovering city name hint */}
      {hovered && !selected && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white bg-black/50 backdrop-blur-md border border-white/20 pointer-events-none whitespace-nowrap">
          {hovered.name}, {hovered.country} — tap to view
        </div>
      )}
    </div>
  );
}

export default WeatherGlobe;
