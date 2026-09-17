# CLAUDE.md — raíz del repositorio

Este repositorio tiene **dos proyectos**:

- `nutrition/` — Maicol Nutrición, la app. **Sus reglas de negocio no
  negociables están en `nutrition/CLAUDE.md`.** Léelas antes de tocar
  nada de la app.
- La raíz — una web estática de trading que **no se toca nunca**:
  `index.html`, `chart.js`, `zones.js`, `supabase.js`,
  `el_sensei_espanol.pine`.

## El cerebro compartido

Aquí se alternan Claude Code, Codex/Astra y ChatGPT, que no comparten
memoria. `brain/` es la memoria común y **`brain/PROTOCOL.md` manda**.

**Antes de cualquier tarea significativa:**

1. `cd nutrition && npm run brain:start` (o `node scripts/brain-preflight.mjs`).
2. `git pull --ff-only`.
3. Leer `brain/PROTOCOL.md`.
4. Leer `brain/CURRENT_STATE.md`.
5. Leer `brain/HANDOFF.md`.
6. Revisar los commits posteriores al último handoff (el preflight los lista).
7. Si otro agente tocó código, inspeccionar ese diff.
8. Consultar sólo las `decisions/` y `playbooks/` que afecten a la tarea.

**Después de cualquier trabajo significativo:**

1. Pasar los tests que correspondan.
2. Actualizar `brain/CURRENT_STATE.md`.
3. Reescribir `brain/HANDOFF.md` y archivar el anterior en `brain/sessions/`.
4. Actualizar `brain/MANIFEST.json`.
5. Guardar sesión en `brain/sessions/` si aporta algo.
6. `npm run brain:check`.
7. Commit y push.

Una idea no se convierte en conocimiento por estar escrita: sólo
`approved` cuenta, y en diseño o UI **sólo el usuario aprueba**.

Si el cerebro y el código se contradicen, **gana Git** y el cerebro se
corrige en el mismo commit.
