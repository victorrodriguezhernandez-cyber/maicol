"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

/**
 * Error boundary for the capture flows (foto, etiqueta, texto, voz,
 * manual, buscar, receta, favoritos).
 *
 * These are the flows where an error is most expensive: the user has
 * already taken a photo or dictated a meal. The copy says so explicitly
 * and points back to the manual entry route, which works offline, rather
 * than to Hoy — losing the capture is bad, but silently sending the user
 * home with no explanation is worse.
 */
export default function RegistrarError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[registrar] error boundary:", error);
  }, [error]);

  return (
    <ErrorScreen
      title="No hemos podido completar el registro"
      description="Puedes reintentarlo, o registrar la comida a mano si el problema persiste."
      digest={error.digest}
      onRetry={retry}
      secondaryHref="/registrar/manual"
      secondaryLabel="Registrar a mano"
    />
  );
}
