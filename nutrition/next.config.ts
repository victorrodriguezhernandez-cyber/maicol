import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    // AI capture, auth and every Supabase call require the network; only
    // the app shell, static assets and read-mostly GETs are cached
    // (section 45 — offline is for the shell/history, never for AI).
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/sign\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "meal-thumbnails",
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default withPWA(nextConfig);
