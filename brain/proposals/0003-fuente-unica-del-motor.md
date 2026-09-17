---
type: proposal
status: draft
origin: claude
created: 2026-09-17
validated_by: "-"
area: infra
---

# Quitar la duplicación del motor con una ruta interna

La decisión `0002` duplica el motor a mano en `_shared/`. Funciona y está
protegida por tests, pero cada cambio obliga a redesplegar el Edge
Function inlineando siete archivos.

Idea: exponer la recomendación desde la propia app en una ruta
autenticada y que `ai-coach` la llame con el JWT del usuario. Una sola
fuente de verdad y ningún redespliegue cuando cambie el motor.

Contras sin resolver: el Edge Function pasaría a depender de que Vercel
esté arriba, haría falta la URL del sitio como secreto, y no hay Deno en
este entorno para probar el Edge Function antes de desplegarlo.

`draft`: no está estudiado lo suficiente como para proponerlo en serio.
