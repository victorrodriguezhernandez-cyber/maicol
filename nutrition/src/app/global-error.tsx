"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches errors thrown by the root layout itself,
 * which no `error.tsx` can reach.
 *
 * When this renders it has REPLACED the root layout — the fonts, the
 * theme-init script and `globals.css` may all be gone with it. So it
 * deliberately uses plain inline styles and no imported component: this
 * screen has to render correctly precisely when the rest of the app
 * could not. `prefers-color-scheme` covers dark mode without the CSS
 * custom properties it can no longer rely on.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[global] error boundary:", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          padding: "24px",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: "#f6f7f8",
          color: "#16181d",
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background: #0e1013 !important; color: #f2f4f7 !important; }
            .ge-sub { color: #9aa3ad !important; }
            .ge-secondary { border-color: #2a2f36 !important; color: #f2f4f7 !important; }
          }
        `}</style>

        <h1 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>
          La aplicación no ha podido arrancar
        </h1>
        <p className="ge-sub" style={{ fontSize: "14px", margin: 0, maxWidth: "20rem", color: "#5b636d" }}>
          Ha ocurrido un error inesperado. Vuelve a intentarlo; si sigue pasando, cierra y abre la app.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "18rem" }}>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              fontSize: "14px",
              fontWeight: 600,
              color: "#fff",
              background: "linear-gradient(135deg, #1d9a8a, #0f7a6c 75%)",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          {/*
            Deliberately a plain <a>, not next/link: when this boundary is
            showing, the root layout (and with it the router context) has
            been torn down, so a client-side navigation is exactly what we
            cannot rely on. A full document load reboots the app, which is
            the actual recovery path here.
          */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            className="ge-secondary"
            href="/"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid #d9dde2",
              fontSize: "14px",
              fontWeight: 600,
              color: "#16181d",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            Volver a Hoy
          </a>
        </div>

        {error.digest ? (
          <p className="ge-sub" style={{ fontSize: "11px", margin: 0, color: "#8b929b" }}>
            Código del error: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
