"use client";

import { useCallback, useState, useTransition } from "react";

/**
 * Runs a Server Action from an event handler with inline error feedback.
 *
 * Why this exists: the components that write user data all call their
 * Server Action inside `startTransition` with no try/catch. An unhandled
 * error there bubbles to the nearest error boundary, which replaces the
 * whole screen — the user loses the weight, measurement or goal they had
 * just typed, with no way back to it.
 *
 * `run()` catches instead, so the form stays exactly as the user left it
 * and shows a message next to the button they pressed. Errors that are
 * genuinely unexpected still reach the boundary, because only the awaited
 * action is wrapped, not the render.
 *
 * Offline is called out separately: "no internet" and "the server
 * rejected this" need different reactions from the user, and `navigator.
 * onLine` is the one distinction available without inspecting the error.
 */
export function useActionRunner() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback((action: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        console.error("[action]", e);
        setError(
          typeof navigator !== "undefined" && navigator.onLine === false
            ? "Sin conexión. Vuelve a intentarlo cuando tengas red."
            : "No se ha podido guardar. Inténtalo de nuevo.",
        );
      }
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { run, isPending, error, clearError };
}
