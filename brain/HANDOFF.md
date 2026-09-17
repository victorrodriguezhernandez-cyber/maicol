# Último traspaso

- **Agente:** claude
- **Fecha:** 2026-09-17
- **Commit:** `d33da21`
- **Rama:** `claude/nutrition-ai-app-vj15u0`

## Objetivo

Crear la infraestructura del cerebro compartido para que Claude Code,
Codex/Astra y ChatGPT puedan alternarse sin perder contexto. Sin tocar
ninguna funcionalidad de Maicol.

## Qué hice

- `brain/` con `PROTOCOL.md`, `CURRENT_STATE.md`, `HANDOFF.md`,
  `MANIFEST.json` y las carpetas `decisions/`, `proposals/`,
  `playbooks/`, `sessions/`, `archive/`.
- `scripts/brain-preflight.mjs` y `scripts/brain-check.mjs`, sin
  dependencias: sólo Node y `git`.
- `npm run brain:start` y `npm run brain:check` en `nutrition/package.json`.
- `AGENTS.md` en la raíz con el protocolo para Codex/Astra.
- `CLAUDE.md` en la raíz (corto, apunta al cerebro y a las reglas de la app).
- Sección del cerebro añadida al final de `nutrition/CLAUDE.md`, sin tocar
  ninguna de las 12 reglas existentes.
- `.github/workflows/brain.yml`: comprueba en push y PR que si cambia
  código de la aplicación también se actualiza el cerebro.
- Cuatro decisiones reales en `decisions/` y tres propuestas abiertas en
  `proposals/`. `playbooks/` se queda vacío a propósito.

## Archivos modificados

Creados:
- `brain/PROTOCOL.md`, `brain/CURRENT_STATE.md`, `brain/HANDOFF.md`, `brain/MANIFEST.json`
- `brain/decisions/0001..0004-*.md`
- `brain/proposals/0001..0003-*.md`
- `brain/playbooks/README.md`, `brain/sessions/.gitkeep`, `brain/archive/.gitkeep`
- `scripts/brain-preflight.mjs`, `scripts/brain-check.mjs`
- `AGENTS.md`, `CLAUDE.md` (raíz)
- `.github/workflows/brain.yml`

Modificados:
- `nutrition/package.json` (dos scripts nuevos, sin dependencias)
- `nutrition/CLAUDE.md` (sección añadida al final)

## Decisiones

- El cerebro vive en la raíz, no dentro de `nutrition/`: el repo tiene dos
  proyectos y el cerebro es del repo.
- Los scripts se registran en `nutrition/package.json` y no en un
  `package.json` nuevo en la raíz. Ver decisión `0004`: crear uno en la
  raíz podría cambiar cómo despliega Vercel, y eso es producción.
- `brain-check` no sólo mira que el cerebro se haya actualizado: también
  valida los `status:` y hace cumplir que una decisión de diseño no pueda
  quedar `approved` sin `validated_by: user`.

## Tests

- `node scripts/brain-preflight.mjs` — ejecutado, salida correcta.
- `node scripts/brain-check.mjs` — ejecutado, pasa.
- `node scripts/brain-check.mjs --base <commit>` — ejecutado contra un
  rango con código de la app para comprobar que detecta el caso.
- `npm test` en `nutrition/` — 165 tests, sin cambios respecto a antes:
  esta tarea no toca código de la aplicación.

## Problemas

- No hay `package.json` en la raíz del repositorio, así que
  `npm run brain:start` sólo funciona desde `nutrition/`. Desde la raíz
  hay que usar `node scripts/brain-preflight.mjs`. Está documentado en los
  tres sitios (PROTOCOL, AGENTS, CLAUDE).

## Lo que NO toqué a propósito

- Nada de `nutrition/src/`, `nutrition/supabase/`, ni la base de datos.
- Ninguna de las 12 reglas de `nutrition/CLAUDE.md`.
- La web estática de trading de la raíz.
- El despliegue pendiente del commit `58f9652`: sigue esperando el visto
  bueno del usuario.

## Pendientes

Los de `CURRENT_STATE.md`. El primero sigue siendo desplegar `58f9652`.
