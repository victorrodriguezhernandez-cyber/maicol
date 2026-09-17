# Agentes en este repositorio

Aquí trabajan varios agentes que **no comparten memoria**: Claude Code,
Codex/Astra y ChatGPT. La memoria común es `brain/`.

Las reglas completas están en **`brain/PROTOCOL.md`**. Léelo. Este archivo
sólo dice lo que es obligatorio.

## El repositorio

- `nutrition/` — la app (Next.js 16 + Supabase). Sus reglas de negocio no
  negociables están en `nutrition/CLAUDE.md`. Léelas antes de tocar código.
- La raíz contiene además una **web estática de trading que no se toca
  nunca**: `index.html`, `chart.js`, `zones.js`, `supabase.js`,
  `el_sensei_espanol.pine`.

## Obligatorio ANTES de empezar

```bash
cd nutrition && npm run brain:start     # o: node scripts/brain-preflight.mjs
git pull --ff-only
```

Y después:

1. Lee `brain/CURRENT_STATE.md` y `brain/HANDOFF.md` enteros.
2. Mira los commits posteriores al último handoff — el preflight te los
   lista. Si otro agente tocó código, **lee ese diff antes de escribir**.
3. Abre sólo las `brain/decisions/` y `brain/playbooks/` que afecten a tu
   tarea. No las leas todas.

No empieces si el preflight dice que estás por detrás del remoto: te
cargarías el trabajo del agente anterior.

## Obligatorio AL TERMINAR

1. Pasa los tests que correspondan (`npm test` en `nutrition/`).
2. Actualiza `brain/CURRENT_STATE.md` — sólo el presente, ≤150 líneas.
3. Reescribe `brain/HANDOFF.md`. Mueve el anterior a `brain/sessions/`
   con el nombre `AAAA-MM-DD-agente.md`.
4. Actualiza `brain/MANIFEST.json` (`last_agent`, `last_commit`,
   `updated`, y `active_branch` si cambió).
5. `cd nutrition && npm run brain:check` — o `node scripts/brain-check.mjs`.
6. Commit y push a la rama activa que indique el MANIFEST.

`brain-check` falla si tocaste código de la app y no actualizaste el
cerebro. No lo esquives: es lo único que impide que el siguiente agente
trabaje a ciegas.

## Estados: una idea no es conocimiento

`draft` → `testing` → `proposed` → `approved`, más `rejected` y
`superseded`.

- Sólo `approved` es conocimiento. Lo demás es una hipótesis.
- Lo no aprobado va en `brain/proposals/`, **nunca** en `brain/decisions/`.
- **Diseño y UI: sólo el usuario marca `approved`.** Si crees que algo ha
  quedado perfecto pero él no lo ha dicho, se queda en `testing` o
  `proposed`. `brain-check` lo comprueba y falla si te lo saltas.
- Una decisión histórica no se borra: se marca `superseded`.

## Contra el ruido

No guardes conversaciones triviales ni 20 intentos fallidos. Si un fallo
dejó una enseñanza, guarda **sólo la enseñanza**.

## Si el cerebro y el código se contradicen

Gana Git. El cerebro estaba mal y hay que corregirlo en el mismo commit.

## Limitación conocida

No hay `package.json` en la raíz, así que `npm run brain:start` sólo
funciona desde `nutrition/`. Desde la raíz usa
`node scripts/brain-preflight.mjs`. El porqué está en
`brain/decisions/0004-scripts-del-cerebro-en-nutrition.md`.
