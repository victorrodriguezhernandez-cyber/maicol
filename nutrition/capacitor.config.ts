import type { CapacitorConfig } from "@capacitor/cli";

/**
 * This app is a full Next.js Server Components + Server Actions app
 * (auth, RLS-scoped DB reads, streaming, the works) — there is no static
 * export of it to bundle offline into the native binary the way a
 * simple SPA would be. So the native shell doesn't ship the app's code
 * at all: it's a real iOS app (its own process, its own icon, its own
 * entry in Ajustes > Apps, no Safari chrome, ever) whose single
 * WKWebView points at the same production deployment everyone else
 * hits. Everything Server Component / Server Action / auth / RLS side
 * is 100% unchanged — this only changes the container the UI renders
 * inside on a phone that installed the native app.
 */
const config: CapacitorConfig = {
  appId: "com.maicol.nutricion",
  appName: "Maicol",
  webDir: "public",
  server: {
    // TODO before shipping to a real device: confirm this still points
    // at the current production URL (see HANDOFF_MAICOL.md).
    url: "https://maicol-6vwk.vercel.app",
    cleartext: false,
  },
  ios: {
    // The web app already draws its own status-bar-colored header and
    // handles safe-area insets itself (globals.css) — let it own the
    // whole screen edge-to-edge instead of Capacitor adding its own
    // background behind the notch/home-indicator areas.
    contentInset: "never",
  },
};

export default config;
