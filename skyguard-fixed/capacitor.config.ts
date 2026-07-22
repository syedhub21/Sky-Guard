import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skyguard.weather',
  appName: 'SkyGuard Weather',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      permissions: ['location'],
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
  },
  // Force proper viewport and scaling on Android WebView
  webView: {
    allowNavigation: ['open-meteo.com', 'api.open-meteo.com', 'air-quality-api.open-meteo.com', 'geocoding-api.open-meteo.com'],
  },
};

export default config;
