---
type: decision
status: approved
origin: claude
created: 2026-09-17
validated_by: "-"
area: infra
---

# Los scripts del cerebro se registran en `nutrition/package.json`

## Qué se decidió

`brain:start` y `brain:check` viven en `nutrition/package.json`. Los
scripts en sí están en `scripts/` en la raíz y se pueden ejecutar
directamente con `node scripts/brain-*.mjs` desde cualquier sitio.

## Por qué no un `package.json` nuevo en la raíz

La raíz no tiene `package.json` y sí tiene un `vercel.json` que sirve la
web estática de trading. Crear un `package.json` en la raíz puede cambiar
cómo detecta Vercel el proyecto y eso toca producción, que es
exactamente lo que esta tarea tenía prohibido.

## Limitación que deja

`npm run brain:start` sólo funciona desde `nutrition/`. Desde la raíz hay
que usar `node scripts/brain-preflight.mjs`. Está documentado en
`PROTOCOL.md`, `AGENTS.md` y `CLAUDE.md`.

## Cómo revertirla

Si se confirma que el "Root Directory" del proyecto de Vercel es
`nutrition`, se puede añadir un `package.json` privado en la raíz con
sólo estos dos scripts. Requiere comprobarlo antes, no suponerlo.
