# Protocolo del cerebro compartido

Este repositorio lo trabajan varios agentes (Claude Code, Codex/Astra,
ChatGPT) que no comparten memoria. `brain/` es la memoria común.

**Git demuestra QUÉ cambió. El cerebro explica POR QUÉ.**
Si se contradicen, gana Git y el cerebro se corrige.

## Antes de empezar

1. `npm run brain:start` (desde `nutrition/`) o `node scripts/brain-preflight.mjs` (desde la raíz).
2. `git pull --ff-only` — sin esto no ves lo que hizo el agente anterior.
3. Leer `brain/CURRENT_STATE.md` y `brain/HANDOFF.md`.
4. Mirar los commits posteriores al último handoff (el preflight los lista).
5. Si otro agente tocó código, leer ese diff antes de escribir nada.
6. Abrir sólo las `decisions/` y `playbooks/` que afecten a la tarea.

## Al terminar

1. Pasar los tests que correspondan.
2. Actualizar `CURRENT_STATE.md` (presente, no historia).
3. Reescribir `HANDOFF.md`; el anterior se archiva en `brain/sessions/`.
4. Actualizar `MANIFEST.json`.
5. `npm run brain:check`.
6. Commit y push.

## Los cuatro archivos

| Archivo | Contiene | No contiene |
|---|---|---|
| `PROTOCOL.md` | estas reglas | nada del proyecto |
| `CURRENT_STATE.md` | sólo el PRESENTE (≤150 líneas) | historia, diarios |
| `HANDOFF.md` | sólo el ÚLTIMO traspaso | traspasos viejos |
| `MANIFEST.json` | estado legible por máquina | nada sensible |

## Estados

`draft` → `testing` → `proposed` → `approved`
y además `rejected`, `superseded`.

- **Sólo `approved` es conocimiento.** Todo lo demás es una hipótesis.
- Una propuesta vive en `proposals/`, nunca en `decisions/`.
- **Diseño y UI: sólo el usuario puede marcar `approved`.** Si un agente
  cree que algo está perfecto pero el usuario no lo ha dicho, se queda en
  `testing` o `proposed`. `brain-check` lo comprueba.
- `playbooks/` sólo admite `approved`. No se rellena por rellenar.

## Decisiones

Una por archivo en `decisions/NNNN-titulo.md`, con front matter:

```yaml
---
type: decision
status: approved        # draft|testing|proposed|approved|rejected|superseded
origin: user            # user|claude|codex|chatgpt|shared
created: 2026-09-17
validated_by: user      # quién la confirmó; "-" si nadie todavía
area: entreno           # entreno|nutricion|ia|infra|diseno|datos
---
```

Una decisión histórica **no se borra**: se marca `superseded` y se enlaza
la que la sustituye.

## Contra el ruido

- No se guardan conversaciones triviales.
- No se guardan 20 intentos fallidos. Si un fallo dejó una enseñanza, se
  guarda **sólo la enseñanza**.
- Una idea no se convierte en conocimiento por estar escrita.

## Rama

La rama activa está en `CURRENT_STATE.md` y en `MANIFEST.json`. Todos los
agentes trabajan sobre ella. Nadie la cambia sin dejarlo escrito ahí.
