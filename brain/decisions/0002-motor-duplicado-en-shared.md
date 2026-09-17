---
type: decision
status: approved
origin: claude
created: 2026-09-16
validated_by: user
area: infra
---

# El motor se duplica a mano en `supabase/functions/_shared/`

## Qué se decidió

`progression.ts` y `prescripcion.ts` tienen una copia literal en
`nutrition/supabase/functions/_shared/`. Dos tests de paridad
(`*.paridad.test.ts`) comparan las dos copias caso a caso y también
carácter a carácter.

## Por qué

Los Edge Functions son un deployable Deno aparte y no pueden importar de
`src/`. Es la misma razón por la que ya estaba duplicado
`_shared/trend.ts`. Se duplica en vez de dejar que el modelo improvise
porque lo peor posible es que el coach diga "sube a 16 kg" y la pantalla
del entreno diga otra cosa.

## Coste conocido

Cada cambio en el motor obliga a redesplegar `ai-coach` inlineando los
siete archivos a mano por MCP, porque no hay token de Supabase en el
entorno. Es caro. Ver `proposals/0003`.

## Consecuencia

Si tocas una copia y no la otra, los tests fallan. Está escrito como
regla 12 en `nutrition/CLAUDE.md`.
