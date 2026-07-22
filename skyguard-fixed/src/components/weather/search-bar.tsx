'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Loader2,
  Navigation,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { GeoLocation } from '@/lib/weather-types';
import { fetchGeocodeClient } from '@/lib/client-api';

interface SearchBarProps {
  onSelect: (lat: number, lon: number, name: string, country: string) => void;
}

interface SearchResult {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

/* ------------------------------------------------------------------ */
/*  Debounce hook                                                      */
/* ------------------------------------------------------------------ */

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [locating, setLocating] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Fetch search results */
  useEffect(() => {
    let cancelled = false;

    async function fetchResults() {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        // Load popular cities when empty
        try {
          const data = await fetchGeocodeClient('');
          if (!cancelled) {
            setResults(Array.isArray(data) ? data.slice(0, 8) : []);
          }
        } catch {
          if (!cancelled) setResults([]);
        }
        return;
      }

      setIsLoading(true);
      try {
        const data = await fetchGeocodeClient(debouncedQuery);
        if (!cancelled) {
          setResults(Array.isArray(data) ? data : []);
          setSelectedIndex(-1);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchResults();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  /* Close dropdown on outside click or touch */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  /* Scroll selected item into view */
  useEffect(() => {
    if (selectedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-search-item]');
    const el = items[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onSelect(result.lat, result.lon, result.name, result.country);
      setQuery('');
      setIsOpen(false);
      setSelectedIndex(-1);
    },
    [onSelect]
  );

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSelect(position.coords.latitude, position.coords.longitude, 'Current Location', '');
        setLocating(false);
        setIsOpen(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, [onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [isOpen, results, selectedIndex, handleSelect]
  );

  return (
    <div ref={containerRef} className="relative w-full" style={{ touchAction: 'manipulation' }}>
      {/* Search input */}
      <div className="relative flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 sm:left-3 top-1/2 h-4 w-4 sm:h-4.5 sm:w-4.5 -translate-y-1/2 text-white/60" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search city..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-9 sm:pl-10 pr-9 h-10 sm:h-11 rounded-xl border-white/20 bg-black/30 backdrop-blur-md text-white placeholder:text-white/50 text-sm font-medium focus:border-white/40 focus:ring-white/15"
            aria-label="Search for a city"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            role="combobox"
          />
          {/* Clear button */}
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-white/60 hover:text-white"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Location button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl bg-black/30 border border-white/20 text-white/70 hover:text-white hover:bg-white/15"
          onClick={handleCurrentLocation}
          disabled={locating}
          aria-label="Use current location"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Dropdown — visible, high-contrast */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-white/30 bg-[#0f1b2e]/95 shadow-2xl backdrop-blur-xl"
            style={{ maxHeight: 'min(18rem, 60vh)' }}
            role="listbox"
          >
            {/* Loading header */}
            {isLoading && (
              <div className="flex items-center gap-2 px-4 sm:px-5 py-3 text-xs sm:text-sm text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching...</span>
              </div>
            )}

            {/* Results list */}
            {!isLoading && results.length > 0 && (
              <div
                ref={listRef}
                className="max-h-60 sm:max-h-72 overflow-y-auto overscroll-contain py-0.5 sm:py-1"
              >
                {/* Popular cities label (shown when no query) */}
                {!debouncedQuery && (
                  <div className="px-4 sm:px-5 pt-2 pb-1 text-[10px] sm:text-xs font-bold text-white/70 uppercase tracking-wider">
                    Popular Cities
                  </div>
                )}

                {results.map((result, index) => (
                  <motion.div
                    key={`${result.lat}-${result.lon}-${result.name}`}
                    data-search-item
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.15 }}
                    className={`flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 cursor-pointer transition-colors ${
                      index === selectedIndex
                        ? 'bg-white/15'
                        : 'hover:bg-white/10'
                    }`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="option"
                    aria-selected={index === selectedIndex}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-white/70" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-white truncate">
                        {result.name}
                        {result.state && (
                          <span className="text-white/60">
                            , {result.state}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-xs text-white/70 truncate">
                        {result.country} &middot;{' '}
                        {result.lat.toFixed(2)}, {result.lon.toFixed(2)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* No results */}
            {!isLoading && debouncedQuery.length >= 2 && results.length === 0 && (
              <div className="px-4 sm:px-5 py-4 sm:py-6 text-center text-xs sm:text-sm text-white/60">
                No cities found for &ldquo;{debouncedQuery}&rdquo;
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
