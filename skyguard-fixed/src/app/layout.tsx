import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkyGuard Weather — Secure Weather & Air Quality",
  description:
    "SkyGuard is a secure, feature-rich weather app with real-time air quality monitoring, stunning weather animations, customizable widget layouts, and server-side API protection.",
  keywords: [
    "SkyGuard",
    "Weather",
    "Air Quality",
    "AQI",
    "Next.js",
    "Secure Weather App",
    "Weather Dashboard",
    "Real-time Weather",
  ],
  authors: [{ name: "SkyGuard Team" }],
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-512.png",
    shortcut: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SkyGuard Weather",
  },
  openGraph: {
    title: "SkyGuard Weather",
    description: "Secure weather & air quality monitoring with stunning animations",
    siteName: "SkyGuard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkyGuard Weather",
    description: "Secure weather & air quality monitoring with stunning animations",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Security headers via meta tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        {/* PWA: splash screen color for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
        {/* Service Worker — DISABLED ENTIRELY.
            The SW's cache-first strategy was serving stale JS bundles even
            after code fixes, causing users to see old broken UI. The SW is
            now removed; sw.js is a self-unregistering stub that purges any
            previously-cached data so all browsers load fresh code. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    regs.forEach(function(r) { r.unregister(); });
                  });
                  if (window.caches) {
                    caches.keys().then(function(keys) {
                      keys.forEach(function(k) { caches.delete(k); });
                    });
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0f1a] text-white`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
