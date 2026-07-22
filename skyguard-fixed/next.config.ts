import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles output automatically — no need for "standalone" or "export"
  // For APK builds: temporarily set output: "export" then run `npm run build`
  typescript: {
    // Set to false for stricter builds; kept true for first deploy
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
