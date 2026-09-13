"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

/**
 * Error boundary for everything behind the bottom navigation (Hoy,
 * Diario, Progreso, Coach IA, Recetas, Ajustes).
 *
 * This catches two very different things, which is why it exists at all:
 *
 * 1. A Server Component throwing while rendering the segment (a failed
 *    Supabase read, a bad date param).
 * 2. An error thrown inside `startTransition` by any of the client
 *    components that call Server Actions — deleting a meal, saving a
 *    weight, applying a goal change. Per Next.js, unhandled errors inside
 *    `useTransition` bubble to the nearest error boundary; before this
 *    file existed they reached Next's built-in fallback instead, which
 *    threw the user out of the app with a blank screen.
 *
 * The header and bottom nav stay mounted (error.tsx does not replace the
 * layout above it), so the user is still inside the app and can navigate
 * away instead of being stranded.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[app] error boundary:", error);
  }, [error]);

  return <ErrorScreen digest={error.digest} onRetry={retry} />;
}
