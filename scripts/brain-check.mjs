#!/usr/bin/env node
/**
 * brain:check — el cerebro no se queda atrás del código.
 *
 * Comprueba dos cosas distintas:
 *
 *   1. Si se ha tocado código de la aplicación, también se han
 *      actualizado CURRENT_STATE.md, HANDOFF.md y MANIFEST.json.
 *   2. Que el cerebro es coherente: estados válidos, y ninguna decisión
 *      de diseño marcada `approved` sin que la haya validado el usuario.
 *
 * Sin dependencias: sólo Node y `git`.
 *
 * Uso:
 *   node scripts/brain-check.mjs            # desde el último handoff + lo no commiteado
 *   node scripts/brain-check.mjs --base REF # desde REF hasta HEAD (lo usa la Action)
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BRAIN = join(RAIZ, "brain");

function git(...args) {
  try {
    return execFileSync("git", args, { cwd: RAIZ, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const errores = [];
const notas = [];

// ── Qué archivos han cambiado ─────────────────────────────────────────
const argBase = process.argv.indexOf("--base");
const base = argBase >= 0 ? process.argv[argBase + 1] : null;

const cambiados = new Set();
if (base) {
  // En CI: exactamente el rango que trae el push o el PR.
  for (const f of git("diff", "--name-only", `${base}...HEAD`).split("\n")) {
    if (f) cambiados.add(f);
  }
} else {
  // En local: el trabajo hecho desde el último handoff, commiteado o no.
  // Ese es justamente el trozo que el cerebro tiene que describir.
  let desde = null;
  try {
    const m = JSON.parse(readFileSync(join(BRAIN, "MANIFEST.json"), "utf8"));
    if (m.last_commit && git("cat-file", "-t", m.last_commit) === "commit") desde = m.last_commit;
  } catch {
    /* si el manifest está roto ya lo dirá la validación de abajo */
  }
  if (desde) {
    for (const f of git("diff", "--name-only", `${desde}..HEAD`).split("\n")) {
      if (f) cambiados.add(f);
    }
  }
  // `--untracked-files=all` es importante: sin él, git resume una carpeta
  // nueva entera como una sola línea ("?? scripts/") y entonces ninguna
  // regla de exención puede encajar con los archivos que hay dentro.
  for (const linea of git("status", "--porcelain", "--untracked-files=all").split("\n")) {
    const f = linea.slice(3).trim();
    if (f) cambiados.add(f.includes(" -> ") ? f.split(" -> ")[1] : f);
  }
}

/**
 * Qué cuenta como "código de la aplicación".
 *
 * Todo lo que no esté en esta lista de exentos. Se define por exclusión a
 * propósito: si mañana alguien añade una carpeta nueva con código, entra
 * sola. Lo contrario — una lista de lo que sí cuenta — se queda obsoleta
 * en silencio, que es el fallo que este script existe para evitar.
 */
const EXENTOS = [
  /^brain\//,
  /^\.github\//,
  /^scripts\/brain-/,
  /\.md$/,
  /^\.gitignore$/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)AGENTS\.md$/,
  /(^|\/)\.gitkeep$/,
];
const esExento = (f) => EXENTOS.some((r) => r.test(f));

const codigo = [...cambiados].filter((f) => !esExento(f)).sort();
const OBLIGATORIOS = ["brain/CURRENT_STATE.md", "brain/HANDOFF.md", "brain/MANIFEST.json"];

if (codigo.length > 0) {
  const faltan = OBLIGATORIOS.filter((f) => !cambiados.has(f));
  if (faltan.length > 0) {
    errores.push(
      `Has cambiado ${codigo.length} archivo(s) de la aplicación pero no has actualizado:\n` +
        faltan.map((f) => `    · ${f}`).join("\n") +
        `\n  Código tocado:\n` +
        codigo.slice(0, 12).map((f) => `    · ${f}`).join("\n") +
        (codigo.length > 12 ? `\n    · …y ${codigo.length - 12} más` : ""),
    );
  } else {
    notas.push(`${codigo.length} archivo(s) de la aplicación, y el cerebro está actualizado.`);
  }
} else {
  notas.push("No hay cambios de código de la aplicación en este rango.");
}

// ── El cerebro existe y es coherente ──────────────────────────────────
for (const f of OBLIGATORIOS) {
  if (!existsSync(join(RAIZ, f))) errores.push(`Falta ${f}.`);
}

let manifest = null;
try {
  manifest = JSON.parse(readFileSync(join(BRAIN, "MANIFEST.json"), "utf8"));
  for (const k of [
    "protocol_version",
    "project",
    "active_branch",
    "last_agent",
    "last_commit",
    "updated",
  ]) {
    if (!manifest[k]) errores.push(`MANIFEST.json: falta "${k}".`);
  }
  const AGENTES = ["user", "claude", "codex", "chatgpt", "shared"];
  if (manifest.last_agent && !AGENTES.includes(manifest.last_agent)) {
    errores.push(`MANIFEST.json: last_agent "${manifest.last_agent}" no es uno de ${AGENTES.join("|")}.`);
  }
} catch (e) {
  errores.push(`MANIFEST.json no se puede leer: ${e.message}`);
}

const estadoPath = join(BRAIN, "CURRENT_STATE.md");
if (existsSync(estadoPath)) {
  const n = readFileSync(estadoPath, "utf8").split("\n").length;
  // 150 es el objetivo; se avisa con margen y no se bloquea por 3 líneas.
  if (n > 170) errores.push(`CURRENT_STATE.md tiene ${n} líneas. El tope es 150: pódalo.`);
}

// ── Estados: una propuesta no es conocimiento ─────────────────────────
const ESTADOS = ["draft", "testing", "proposed", "approved", "rejected", "superseded"];
const ORIGENES = ["user", "claude", "codex", "chatgpt", "shared"];

function frontMatter(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const campos = {};
  for (const linea of m[1].split("\n")) {
    const kv = linea.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) campos[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return campos;
}

function revisarCarpeta(carpeta, tipoEsperado, reglaExtra) {
  const dir = join(BRAIN, carpeta);
  if (!existsSync(dir)) return;
  for (const nombre of readdirSync(dir)) {
    if (!nombre.endsWith(".md") || nombre === "README.md") continue;
    const rel = `brain/${carpeta}/${nombre}`;
    const fm = frontMatter(readFileSync(join(dir, nombre), "utf8"));
    if (!fm) {
      errores.push(`${rel}: le falta el front matter (--- ... ---).`);
      continue;
    }
    if (fm.type !== tipoEsperado) {
      errores.push(`${rel}: type debería ser "${tipoEsperado}" y es "${fm.type ?? "nada"}".`);
    }
    if (!ESTADOS.includes(fm.status)) {
      errores.push(`${rel}: status "${fm.status ?? "nada"}" no es uno de ${ESTADOS.join("|")}.`);
    }
    if (!ORIGENES.includes(fm.origin)) {
      errores.push(`${rel}: origin "${fm.origin ?? "nada"}" no es uno de ${ORIGENES.join("|")}.`);
    }
    if (!fm.created) errores.push(`${rel}: falta created.`);
    if (!fm.area) errores.push(`${rel}: falta area.`);
    reglaExtra?.(rel, fm);
  }
}

revisarCarpeta("decisions", "decision", (rel, fm) => {
  // El corazón del sistema contra el ruido: en diseño y UI, sólo el
  // usuario convierte algo en conocimiento. Que un agente esté convencido
  // de que ha quedado perfecto no es una validación.
  const esDiseno = /dise|ui|ux|visual/i.test(fm.area ?? "");
  if (fm.status === "approved" && esDiseno && fm.validated_by !== "user") {
    errores.push(
      `${rel}: es de ${fm.area} y está "approved" con validated_by="${fm.validated_by ?? "nada"}".\n` +
        `  Sólo el usuario aprueba una solución visual. Déjala en "testing" o "proposed".`,
    );
  }
  if (fm.status === "approved" && !fm.validated_by) {
    errores.push(`${rel}: "approved" sin validated_by. Pon quién lo validó, o "-" y bájalo a proposed.`);
  }
});

revisarCarpeta("proposals", "proposal", (rel, fm) => {
  // Si estuviera aprobada ya no sería una propuesta: sería una decisión,
  // y viviría en decisions/. Tenerla aquí aprobada es justo la confusión
  // que hace que un agente la trate como definitiva.
  if (fm.status === "approved") {
    errores.push(`${rel}: una propuesta "approved" tiene que moverse a brain/decisions/.`);
  }
});

revisarCarpeta("playbooks", "playbook", (rel, fm) => {
  if (fm.status !== "approved") {
    errores.push(`${rel}: playbooks/ sólo admite "approved" (está en "${fm.status}").`);
  }
});

// ── Resultado ─────────────────────────────────────────────────────────
console.log("\n\x1b[1mCEREBRO — comprobación\x1b[0m\n");
for (const n of notas) console.log(`  ${verde("ok")}  ${n}`);
if (errores.length === 0) {
  console.log(`  ${verde("ok")}  Estados y metadatos coherentes.`);
  console.log(gris("\n  Todo en orden. Puedes commitear.\n"));
  process.exit(0);
}
for (const e of errores) console.log(`  ${rojo("✗")}  ${e}`);
console.log(rojo(`\n  ${errores.length} problema(s). El cerebro tiene que ir con el código.\n`));
process.exit(1);
