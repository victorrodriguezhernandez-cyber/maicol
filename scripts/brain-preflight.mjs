#!/usr/bin/env node
/**
 * brain:start — lo que un agente tiene que saber antes de tocar nada.
 *
 * Sin dependencias: sólo Node y `git`. Se puede ejecutar desde cualquier
 * directorio del repositorio.
 *
 * Sale con código 1 sólo cuando hay algo que el agente DEBE hacer antes
 * de empezar (falta un archivo del cerebro, o la rama está por detrás del
 * remoto). Estar por detrás es el caso importante: es exactamente cómo se
 * pierde el trabajo del agente anterior.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

const t = {
  titulo: (s) => `\n\x1b[1m${s}\x1b[0m`,
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  aviso: (s) => `\x1b[33m${s}\x1b[0m`,
  mal: (s) => `\x1b[31m${s}\x1b[0m`,
  gris: (s) => `\x1b[90m${s}\x1b[0m`,
};

let problemas = 0;

console.log(t.titulo("CEREBRO — antes de empezar"));

// ── Git ───────────────────────────────────────────────────────────────
const rama = git("rev-parse", "--abbrev-ref", "HEAD");
const ultimo = git("log", "-1", "--format=%h  %ad  %s", "--date=short");
const sucio = git("status", "--porcelain");

console.log(t.titulo("Git"));
console.log(`  Rama            ${rama || t.mal("¿?")}`);
console.log(`  Último commit   ${ultimo || t.mal("¿?")}`);
console.log(
  `  Cambios locales ${sucio ? t.aviso(`${sucio.split("\n").length} archivo(s) sin commitear`) : t.ok("ninguno")}`,
);
if (sucio) console.log(t.gris(sucio.split("\n").map((l) => `                  ${l}`).join("\n")));

// Traer el remoto es lo único que permite saber si el agente anterior
// dejó trabajo que aquí todavía no se ve.
git("fetch", "--quiet");
const upstream = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}");
if (!upstream) {
  console.log(`  Remoto          ${t.aviso("esta rama no sigue a ninguna rama remota")}`);
} else {
  const cuenta = git("rev-list", "--left-right", "--count", `${upstream}...HEAD`);
  const [detras, delante] = cuenta.split(/\s+/).map(Number);
  if (detras > 0) {
    problemas++;
    console.log(
      `  Remoto          ${t.mal(`${detras} commit(s) POR DETRÁS de ${upstream}`)}\n` +
        `                  ${t.mal("→ git pull --ff-only  ANTES de tocar nada")}`,
    );
  } else {
    console.log(
      `  Remoto          ${t.ok("al día")}${delante > 0 ? t.gris(` (${delante} sin pushear)`) : ""}`,
    );
  }
}

// ── Archivos del cerebro ──────────────────────────────────────────────
function leer(nombre) {
  const p = join(BRAIN, nombre);
  if (!existsSync(p)) {
    problemas++;
    console.log(t.mal(`  FALTA brain/${nombre}`));
    return null;
  }
  return readFileSync(p, "utf8");
}

console.log(t.titulo("Cerebro"));

const manifestRaw = leer("MANIFEST.json");
let manifest = null;
if (manifestRaw) {
  try {
    manifest = JSON.parse(manifestRaw);
    console.log(
      `  MANIFEST        proyecto=${manifest.project} rama=${manifest.active_branch}\n` +
        `                  último agente=${manifest.last_agent} commit=${manifest.last_commit}\n` +
        `                  actualizado=${manifest.updated}`,
    );
    if (manifest.active_branch && rama && manifest.active_branch !== rama) {
      console.log(
        t.aviso(
          `  ${"".padEnd(14)}  ojo: el cerebro dice que la rama activa es ${manifest.active_branch}`,
        ),
      );
    }
  } catch (e) {
    problemas++;
    console.log(t.mal(`  MANIFEST.json no es JSON válido: ${e.message}`));
  }
}

const estado = leer("CURRENT_STATE.md");
if (estado) {
  const lineas = estado.split("\n");
  console.log(`  CURRENT_STATE   ${lineas.length} líneas`);
  // Las viñetas de cabecera son el resumen; el resto se lee entero aparte.
  for (const l of lineas.filter((l) => /^- \*\*/.test(l)).slice(0, 8)) {
    console.log(t.gris(`                  ${l.replace(/\*\*/g, "")}`));
  }
  if (lineas.length > 170) {
    console.log(t.aviso("                  pasa de 150 líneas: toca podarlo"));
  }
}

const handoff = leer("HANDOFF.md");
if (handoff) {
  const cabecera = handoff
    .split("\n")
    .filter((l) => /^- \*\*(Agente|Fecha|Commit|Rama)/.test(l))
    .map((l) => `                  ${l.replace(/\*\*/g, "")}`);
  console.log(`  HANDOFF         último traspaso:`);
  console.log(t.gris(cabecera.join("\n")));
}

// ── Qué ha pasado desde el último handoff ─────────────────────────────
console.log(t.titulo("Desde el último handoff"));
const desde = manifest?.last_commit;
let posteriores = "";
if (desde && git("cat-file", "-t", desde) === "commit") {
  posteriores = git("log", `${desde}..HEAD`, "--oneline");
  if (posteriores) {
    console.log(
      t.aviso(`  ${posteriores.split("\n").length} commit(s) después de ${desde}:`),
    );
    console.log(posteriores.split("\n").map((l) => `    ${l}`).join("\n"));
    console.log(
      t.aviso(`  → lee el diff antes de escribir: git diff ${desde}..HEAD --stat`),
    );
  } else {
    console.log(t.ok(`  Ninguno. El cerebro está al día con el código.`));
  }
} else {
  console.log(t.aviso("  No se puede comprobar: MANIFEST.last_commit no apunta a un commit real."));
}

console.log(t.titulo("Últimos commits"));
console.log(git("log", "-8", "--oneline").split("\n").map((l) => `  ${l}`).join("\n"));

console.log(t.titulo("Ahora"));
console.log("  1. git pull --ff-only");
console.log("  2. lee brain/PROTOCOL.md, brain/CURRENT_STATE.md y brain/HANDOFF.md enteros");
console.log("  3. abre sólo las decisions/ y playbooks/ que afecten a tu tarea");
console.log(t.gris("  Al terminar: npm run brain:check\n"));

process.exit(problemas > 0 ? 1 : 0);
