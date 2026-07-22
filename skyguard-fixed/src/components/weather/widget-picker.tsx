'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { WidgetStyle } from '@/lib/weather-types';

interface WidgetPickerProps {
  currentStyle: WidgetStyle;
  onStyleChange: (style: WidgetStyle) => void;
}

const widgetOptions: {
  style: WidgetStyle;
  name: string;
  description: string;
}[] = [
  {
    style: 'classic',
    name: 'Classic',
    description: 'Full cards with all details visible in a traditional layout',
  },
  {
    style: 'compact',
    name: 'Compact',
    description: 'Condensed view with smaller fonts and higher data density',
  },
  {
    style: 'gauge',
    name: 'Gauge',
    description: 'AQI gauge and weather gauges with circular instruments',
  },
  {
    style: 'minimal',
    name: 'Minimal',
    description: 'Just the essentials — temp, condition, and AQI badge',
  },
  {
    style: 'glass',
    name: 'Glass',
    description: 'Frosted glass card with all key info — like a Samsung widget',
  },
  {
    style: 'timeline',
    name: 'Timeline',
    description: 'Vertical timeline of weather events — like a Google widget',
  },
];

/* ------------------------------------------------------------------ */
/*  Mini SVG preview illustrations for each style                     */
/* ------------------------------------------------------------------ */

function ClassicPreview() {
  return (
    <svg viewBox="0 0 80 56" className="w-full h-auto" fill="none">
      {/* Stacked card 1 - main */}
      <rect x="4" y="2" width="72" height="22" rx="4" className="fill-muted stroke-muted-foreground/20" strokeWidth="0.5" />
      <circle cx="18" cy="13" r="5" className="fill-primary/30" />
      <rect x="28" y="9" width="20" height="3" rx="1" className="fill-foreground/50" />
      <rect x="28" y="14" width="14" height="2" rx="1" className="fill-muted-foreground/40" />
      {/* Stacked card 2 - details */}
      <rect x="4" y="28" width="34" height="22" rx="4" className="fill-muted stroke-muted-foreground/20" strokeWidth="0.5" />
      <rect x="10" y="34" width="22" height="2" rx="1" className="fill-foreground/40" />
      <rect x="10" y="39" width="16" height="2" rx="1" className="fill-muted-foreground/30" />
      <rect x="10" y="44" width="20" height="2" rx="1" className="fill-muted-foreground/30" />
      {/* Stacked card 3 */}
      <rect x="42" y="28" width="34" height="22" rx="4" className="fill-muted stroke-muted-foreground/20" strokeWidth="0.5" />
      <rect x="48" y="34" width="22" height="2" rx="1" className="fill-foreground/40" />
      <rect x="48" y="39" width="16" height="2" rx="1" className="fill-muted-foreground/30" />
      <rect x="48" y="44" width="20" height="2" rx="1" className="fill-muted-foreground/30" />
    </svg>
  );
}

function CompactPreview() {
  return (
    <svg viewBox="0 0 80 56" className="w-full h-auto" fill="none">
      {/* Tight 2x3 grid of small cards */}
      <rect x="4" y="2" width="23" height="16" rx="3" className="fill-muted stroke-muted-foreground/20" strokeWidth="0.5" />
      <rect x="8" y="6" width="14" height="2" rx="1" className="fill-foreground/40" />
      <rect x="8" y="11" width="10" height="2" rx="1" className="fill-muted-foreground/30" />

      <rect x="30" y="2" width="23" height="16" rx="3" className="fill-muted stroke-muted-foreground/20" strokeWidth="0.5" />
      <rect x="34" y="6" width="14" height="2" rx="1" className="fill-foreground/40" />
      <rect x="34" y="11" width="10" height="2" rx="1" className="fill-muted-foreground/30" />

      <rect x="56" y="2" width="20" height="16" rx="3" className="fill-muted stroke-muted-foreground/20" strokeWidth="0.5" />
      <rect x="60" y="6" width="12" height="2" rx="1" className="fill-foreground/40" />
      <rect x="60" y="11" width="8" height="2" rx="1" className="fill-muted-foreground/30" />

      <rect x="4" y="22" width="23" height="16" rx="3" className="fill-muted stroke-muted-foreground/20" strokeWidth="0.5" />
      <rect x="8" y="26" width="14" height="2" rx="1" className="fill-foreground/40" />
      <rect x="8" y="31" width="10" height="2" rx="1" className="fill-muted-foreground/30" />

      <rect x="30" y="22" width="23" height="16" rx="3" className="fill-muted stroke-muted-foreground/20" strokeWidth="0.5" />
      <rect x="34" y="26" width="14" height="2" rx="1" className="fill-foreground/40" />
      <rect x="34" y="31" width="10" height="2" rx="1" className="fill-muted-foreground/30" />

      <rect x="56" y="22" width="20" height="16" rx="3" className="fill-muted stroke-muted-foreground/20" strokeWidth="0.5" />
      <rect x="60" y="26" width="12" height="2" rx="1" className="fill-foreground/40" />
      <rect x="60" y="31" width="8" height="2" rx="1" className="fill-muted-foreground/30" />

      {/* Bottom row */}
      <rect x="4" y="42" width="50" height="12" rx="3" className="fill-muted stroke-muted-foreground/20" strokeWidth="0.5" />
      <rect x="8" y="46" width="30" height="2" rx="1" className="fill-foreground/30" />
    </svg>
  );
}

function GaugePreview() {
  return (
    <svg viewBox="0 0 80 56" className="w-full h-auto" fill="none">
      {/* Large circular gauge */}
      <circle cx="28" cy="28" r="20" className="stroke-muted-foreground/25" strokeWidth="3" />
      <path
        d="M 28 8 A 20 20 0 1 1 13.1 43"
        className="stroke-primary/60"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <text x="28" y="26" textAnchor="middle" className="fill-foreground/70" fontSize="8" fontWeight="600">72</text>
      <text x="28" y="34" textAnchor="middle" className="fill-muted-foreground/50" fontSize="4">AQI</text>

      {/* Small gauge 1 */}
      <circle cx="62" cy="16" r="10" className="stroke-muted-foreground/25" strokeWidth="2" />
      <path
        d="M 62 6 A 10 10 0 0 1 71.6 21"
        className="stroke-chart-2/60"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text x="62" y="18" textAnchor="middle" className="fill-foreground/60" fontSize="5" fontWeight="500">65</text>

      {/* Small gauge 2 */}
      <circle cx="62" cy="42" r="10" className="stroke-muted-foreground/25" strokeWidth="2" />
      <path
        d="M 62 32 A 10 10 0 1 1 57.3 51.6"
        className="stroke-chart-4/60"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text x="62" y="44" textAnchor="middle" className="fill-foreground/60" fontSize="5" fontWeight="500">78</text>
    </svg>
  );
}

function MinimalPreview() {
  return (
    <svg viewBox="0 0 80 56" className="w-full h-auto" fill="none">
      {/* Single minimal card */}
      <rect x="8" y="8" width="64" height="40" rx="6" className="fill-muted/50 stroke-muted-foreground/15" strokeWidth="0.5" />
      {/* Big temp */}
      <text x="24" y="33" className="fill-foreground/70" fontSize="18" fontWeight="700">24°</text>
      {/* Condition */}
      <rect x="46" y="16" width="18" height="3" rx="1" className="fill-foreground/40" />
      {/* AQI badge */}
      <rect x="46" y="28" width="18" height="10" rx="5" className="fill-primary/25" />
      <text x="55" y="35.5" textAnchor="middle" className="fill-foreground/50" fontSize="6" fontWeight="500">Good</text>
    </svg>
  );
}

function GlassPreview() {
  return (
    <svg viewBox="0 0 80 56" className="w-full h-auto" fill="none">
      {/* Single frosted glass card - rounded */}
      <rect x="4" y="4" width="72" height="48" rx="8" className="fill-muted/40 stroke-muted-foreground/20" strokeWidth="0.5" />
      {/* Top row: icon + temp + condition */}
      <circle cx="16" cy="16" r="4" className="fill-primary/30" />
      <text x="24" y="19" className="fill-foreground/70" fontSize="9" fontWeight="700">28°</text>
      <rect x="38" y="13" width="22" height="3" rx="1" className="fill-foreground/40" />
      {/* Location */}
      <rect x="16" y="24" width="30" height="2" rx="1" className="fill-muted-foreground/30" />
      {/* Divider line */}
      <line x1="12" y1="30" x2="68" y2="30" className="stroke-muted-foreground/15" strokeWidth="0.5" />
      {/* Bottom row: humidity, wind, AQI badge */}
      <rect x="12" y="34" width="12" height="2.5" rx="1" className="fill-chart-2/40" />
      <rect x="28" y="34" width="12" height="2.5" rx="1" className="fill-chart-4/40" />
      <rect x="50" y="32" width="16" height="8" rx="4" className="fill-primary/25" />
      <text x="58" y="38.5" textAnchor="middle" className="fill-foreground/40" fontSize="5" fontWeight="500">AQI</text>
      {/* Sunrise/sunset at bottom */}
      <circle cx="20" cy="46" r="2" className="fill-amber-400/50" />
      <rect x="24" y="44" width="10" height="2" rx="1" className="fill-muted-foreground/25" />
      <circle cx="50" cy="46" r="2" className="fill-orange-400/50" />
      <rect x="54" y="44" width="10" height="2" rx="1" className="fill-muted-foreground/25" />
    </svg>
  );
}

function TimelinePreview() {
  return (
    <svg viewBox="0 0 80 56" className="w-full h-auto" fill="none">
      {/* Card background */}
      <rect x="4" y="4" width="72" height="48" rx="6" className="fill-muted/30 stroke-muted-foreground/15" strokeWidth="0.5" />
      {/* Header: location + temp + icon */}
      <rect x="10" y="9" width="24" height="2.5" rx="1" className="fill-muted-foreground/40" />
      <text x="50" y="12" className="fill-foreground/60" fontSize="7" fontWeight="600">28°</text>
      <circle cx="62" cy="11" r="3" className="fill-primary/30" />
      {/* Divider */}
      <line x1="10" y1="16" x2="70" y2="16" className="stroke-muted-foreground/15" strokeWidth="0.5" />
      {/* Timeline vertical line */}
      <line x1="20" y1="22" x2="20" y2="46" className="stroke-muted-foreground/20" strokeWidth="1.5" strokeLinecap="round" />
      {/* Sunrise event */}
      <circle cx="20" cy="22" r="2.5" className="fill-amber-400/60" />
      <rect x="26" y="20" width="18" height="2" rx="1" className="fill-foreground/40" />
      <rect x="26" y="23" width="12" height="1.5" rx="1" className="fill-muted-foreground/25" />
      {/* Current event */}
      <circle cx="20" cy="32" r="2.5" className="fill-primary/60" />
      <rect x="26" y="30" width="22" height="2" rx="1" className="fill-foreground/50" />
      <rect x="26" y="33" width="14" height="1.5" rx="1" className="fill-muted-foreground/30" />
      {/* Sunset event */}
      <circle cx="20" cy="42" r="2.5" className="fill-orange-400/60" />
      <rect x="26" y="40" width="18" height="2" rx="1" className="fill-foreground/40" />
      <rect x="26" y="43" width="12" height="1.5" rx="1" className="fill-muted-foreground/25" />
    </svg>
  );
}

const previewMap: Record<WidgetStyle, () => React.ReactElement> = {
  classic: ClassicPreview,
  compact: CompactPreview,
  gauge: GaugePreview,
  minimal: MinimalPreview,
  glass: GlassPreview,
  timeline: TimelinePreview,
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function WidgetPicker({ currentStyle, onStyleChange }: WidgetPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {widgetOptions.map((option) => {
        const isSelected = currentStyle === option.style;
        const PreviewComponent = previewMap[option.style];

        return (
          <motion.div
            key={option.style}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Card
              className={`cursor-pointer overflow-hidden transition-all duration-300 ${
                isSelected
                  ? 'ring-2 ring-primary shadow-lg'
                  : 'ring-1 ring-border hover:ring-muted-foreground/40'
              }`}
              style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                background: isSelected
                  ? 'rgba(var(--card), 0.85)'
                  : 'rgba(var(--card), 0.5)',
              }}
              onClick={() => onStyleChange(option.style)}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Select ${option.name} layout`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onStyleChange(option.style);
                }
              }}
            >
              <CardContent className="p-3 sm:p-4">
                {/* Preview */}
                <motion.div
                  className="mb-3 rounded-md bg-muted/30 p-2"
                  initial={false}
                  animate={{ opacity: isSelected ? 1 : 0.7 }}
                  transition={{ duration: 0.3 }}
                >
                  <PreviewComponent />
                </motion.div>

                {/* Name & description */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold leading-tight">
                      {option.name}
                    </h4>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                      {option.description}
                    </p>
                  </div>

                  {/* Selected indicator */}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isSelected ? 1 : 0,
                      opacity: isSelected ? 1 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="h-3 w-3" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
