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
  // Next.js 16 runs Turbopack by default and refuses to start when it also
  // finds a webpack config, rather than silently ignoring one of them —
  // and @ducanh2912/next-pwa always injects a webpack config, even though
  // it disables itself in development. That combination made `npm run dev`
  // fail to boot outright. An empty turbopack config is the framework's
  // own documented way to say "this is intentional, use Turbopack here";
  // the production build keeps using webpack via `next build --webpack`,
  // which is what the PWA plugin actually needs to emit the service
  // worker.
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  // Baseline security headers (OWASP "security misconfiguration" / the
  // security-and-hardening skill's "Always Do" list). Deliberately limited
  // to headers with no plausible functional impact — no CSP or
  // Permissions-Policy here: this app needs the camera (foto/etiqueta),
  // the microphone (voz), Supabase Storage image domains and an inline
  // theme-init script (see ARCHITECTURE.md), so a real CSP needs to be
  // designed and tested against those flows rather than added blind.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
