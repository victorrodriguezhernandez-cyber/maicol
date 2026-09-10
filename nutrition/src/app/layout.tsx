import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { OfflineSyncBoundary } from "@/components/offline/OfflineSyncBoundary";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import "./globals.css";

// IBM Plex Sans + IBM Plex Mono, deliberately — not the default Geist the
// Next.js starter ships with. This is a nutrition/quantified-self tool
// where numbers ARE the content (kcal, macros, kg); Plex Mono's tabular
// figures give the stat displays real precision-instrument character
// instead of reading as UI chrome, and Plex Sans (same foundry, designed
// to pair) carries every label/heading around them.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Maicol Nutrición",
    template: "%s · Maicol Nutrición",
  },
  description:
    "Seguimiento personal de nutrición, peso y volumen asistido por IA.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Maicol",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#12161C",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-[var(--app-bg)]">
        <script
          // Applies the last-known theme before paint to avoid a flash.
          // The real preference lives in user_preferences (synced by the
          // settings page); this is just the fast local cache of it.
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}`,
          }}
        />
        <OfflineSyncBoundary />
        <InstallPrompt />
        {children}
      </body>
    </html>
  );
}
