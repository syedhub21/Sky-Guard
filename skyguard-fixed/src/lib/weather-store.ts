import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GeoLocation, WidgetStyle, WeatherData } from './weather-types';

interface WeatherStore {
  // Location
  location: GeoLocation | null;
  setLocation: (location: GeoLocation) => void;

  // Widget style
  widgetStyle: WidgetStyle;
  setWidgetStyle: (style: WidgetStyle) => void;

  // Weather data cache
  weatherData: WeatherData | null;
  setWeatherData: (data: WeatherData) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Unit preference
  useCelsius: boolean;
  setUseCelsius: (celsius: boolean) => void;

  // Last updated
  lastUpdated: number | null;

  // Security - biometric lock enabled
  biometricLock: boolean;
  setBiometricLock: (enabled: boolean) => void;
}

export const useWeatherStore = create<WeatherStore>()(
  persist(
    (set) => ({
      location: null,
      setLocation: (location) => set({ location }),

      widgetStyle: 'classic',
      setWidgetStyle: (widgetStyle) => set({ widgetStyle }),

      weatherData: null,
      setWeatherData: (weatherData) => set({ weatherData, lastUpdated: Date.now(), error: null }),

      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),

      error: null,
      setError: (error) => set({ error }),

      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      useCelsius: true,
      setUseCelsius: (useCelsius) => set({ useCelsius }),

      lastUpdated: null,

      biometricLock: false,
      setBiometricLock: (biometricLock) => set({ biometricLock }),
    }),
    {
      name: 'skyguard-storage',
      partialize: (state) => ({
        location: state.location,
        widgetStyle: state.widgetStyle,
        useCelsius: state.useCelsius,
        biometricLock: state.biometricLock,
      }),
    }
  )
);
