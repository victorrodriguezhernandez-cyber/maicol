# HANDOFF — Maicol Nutrición

Documento de entrega para quien continúe este proyecto (humano o agente
de IA) sin el contexto de las sesiones anteriores. Léelo primero, entero,
antes de tocar código.

## Snapshot exacto de este paquete

- **Repositorio**: `victorrodriguezhernandez-cyber/maicol` (GitHub).
- **App real**: vive en el subdirectorio `nutrition/` de ese repo — la
  raíz del repo también contiene una web estática de trading sin
  relación (`index.html`, `chart.js`, `zones.js`,
  `el_sensei_espanol.pine`, `supabase.js`) que **no** forma parte de este
  proyecto. No la toques salvo que te lo pidan explícitamente.
- **Rama**: `claude/nutrition-ai-app-vj15u0` (también fusionada a `main`,
  que es la rama de producción real en Vercel — ver "Despliegue" abajo).
- **Commit de referencia de este ZIP**: `ae74368f16b386365bc2ce4d31196dd8cf2cd8b4`
  en la rama `claude/nutrition-ai-app-vj15u0` (fusionada, idéntica, a
  `main` en ese momento — ver "Despliegue" abajo). Es el commit que
  introdujo estos tres documentos de handoff; el contenido del propio
  archivo del ZIP puede llevar como mucho un commit más encima de ese
  (una corrección menor a este mismo párrafo) — para el hash exacto y
  definitivo, usa `git log -1` sobre el checkout real en vez de fiarte
  solo de este número. El `.git/` no se incluye en el ZIP (ver "Qué NO se
  incluye" al final) — si necesitas el historial completo, clona
  `victorrodriguezhernandez-cyber/maicol`.
- **Estado verificado en el momento de generar este ZIP**: `npx tsc
  --noEmit`, `npx eslint .`, `npm run test` (34/34) y `npm run build`
  pasan limpios. No se garantiza que sigan pasando si el destinatario
  edita algo antes de instalar/compilar — vuelve a correr los cuatro tras
  clonar/descomprimir.

## Qué es este proyecto

Maicol Nutrición: una PWA personal (Next.js 16 + Supabase) de
seguimiento de nutrición, peso y volumen para un único usuario (Víctor,
18 años, ~64 kg, objetivo: ganar masa muscular), con captura de comidas
por foto/etiqueta/texto/voz asistida por IA (Gemini) y un "Coach IA" que
responde sobre los datos reales del usuario y puede, con permiso
explícito o para acciones de bajo riesgo, registrar/corregir cosas por
él. Es un V1 real y funcional — no hay datos ni respuestas de IA
simuladas en ningún punto (ver `README.md` para la lista honesta de lo
que SÍ y NO está implementado).

## Por dónde empezar a leer

En este orden:

1. **Este archivo** — contexto operativo y de qué va todo esto.
2. `README.md` — stack, scripts, estado del proyecto, qué falta.
3. `ARCHITECTURE.md` — cómo encajan las piezas (frontend/backend/IA),
   flujo de datos de "registrar una comida", auth, PWA.
4. `DATABASE.md` — esquema Postgres, RLS, storage, migraciones.
5. `AI.md` — la capa de IA: jerarquía de fuentes, contrato de salida
   estructurada, las tools del Coach IA, qué le falta.
6. `DEPLOYMENT.md` — qué está ya desplegado, cómo desplegar desde cero.
7. `CRITICAL_FLOWS.md` (nuevo en este handoff) — los 10 invariantes que
   NUNCA deben romperse, con el código exacto que los implementa. Léelo
   antes de tocar cualquier cosa relacionada con macros, tendencia de
   peso, objetivos, el Coach IA, auth, husos horarios, u offline.
8. `DESIGN_REBUILD_MAP.md` (nuevo en este handoff) — sistema de diseño,
   tokens, primitivas compartidas, y qué archivo toca cada pantalla si
   necesitas rediseñar algo.
9. `CLAUDE.md` — las mismas reglas no negociables que `CRITICAL_FLOWS.md`
   detalla, en su forma original/resumida (es el archivo que Claude Code
   lee automáticamente al abrir este repo).

## Arrancar en local

```bash
cd nutrition
npm install
cp .env.example .env.local   # rellena con credenciales reales — ver DEPLOYMENT.md
npm run dev                   # Turbopack, PWA desactivada, http://localhost:3000
```

Los flujos de IA (foto/etiqueta/texto/voz/coach) llaman a los Edge
Functions **ya desplegados** en el proyecto Supabase real — no hace
falta levantar Supabase en local para probarlos, solo que
`GEMINI_API_KEY` esté puesto como secreto en ese proyecto Supabase (no en
`.env.local`).

## Estado de la infraestructura ya provisionada

- **Supabase**: proyecto `Maicol`, ref `pyiukqeuaxonsrrgbfzq`, región
  `eu-west-1`. Comparte este proyecto con la web de trading (tablas
  `zonas_historial`/`niveles_historial`/`analisis_actual` — no las
  toques, ver `ARCHITECTURE.md`). Migraciones `0001`–`0004` aplicadas.
  Edge Functions desplegadas: `analyze-meal-photo`, `analyze-label-photo`,
  `analyze-text`, `analyze-voice`, `ai-coach` (todas `verify_jwt: true`).
- **Vercel**: proyecto `maicol-6vwk` (team
  `victorrh08-6041s-projects`), Root Directory = `nutrition`, conectado a
  `main` como rama de producción → `https://maicol-6vwk.vercel.app`. Hay
  un segundo proyecto Vercel (`maicol`) en el mismo repo que sirve la web
  de trading — no lo confundas con este.
  **Importante**: las Preview deployments de ramas que no sean `main` no
  tienen las variables de entorno configuradas (solo Production las
  tiene) — durante buena parte de este proyecto eso hizo que el trabajo
  en la rama de feature nunca llegara a verse desplegado. El flujo que
  ha funcionado de forma fiable es: desarrollar en
  `claude/nutrition-ai-app-vj15u0`, y cuando esté verificado (tsc/eslint/
  test/build limpios), hacer push directo a `main` (fast-forward) y
  luego sincronizar la rama de feature con `main`. Antes de repetir este
  flujo, comprueba si alguien ya configuró las variables en Preview — si
  es así, ya no hace falta este atajo.
- **Secretos que faltan en todos los entornos**:
  `SUPABASE_SERVICE_ROLE_KEY` no está configurada ni en Vercel ni en
  ningún sitio — actualmente nada la necesita (su único consumidor,
  el caché de catálogo del escáner de código de barras, se eliminó), pero
  si añades una función que sí la necesite, tendrás que configurarla tú
  (Supabase Dashboard → Settings → API → clave `service_role`, pegarla
  como env var **secreta**, nunca `NEXT_PUBLIC_*`).

## Auth — lo no obvio

No hay registro ni "olvidé mi contraseña". Es una app de un único
usuario: una cuenta Supabase Auth fija, y el campo "Usuario" que se
teclea en `/login` es literalmente la contraseña de esa cuenta (ver
`CRITICAL_FLOWS.md` regla 8 para el detalle completo, incluida la forma
de resetearla por SQL directo si hiciera falta). Si vas a dar de alta un
entorno nuevo desde cero (otro proyecto Supabase), tendrás que crear esa
cuenta tú mismo — no hay flujo de "sign up" en la UI.

## Qué se hizo en las sesiones recientes (contexto reciente, no histórico completo)

- Se sustituyó el login por email/magic-link por el esquema de una sola
  palabra descrito arriba, y se arregló que la app quedara en pantalla
  negra sin cobertura (relacionado con el manejo de sesión en
  `src/proxy.ts`, el `middleware.ts` renombrado de Next.js 16).
- Se eliminó el escáner de código de barras (poco fiable) a favor de
  "Fotografiar etiqueta"; se quitó `capture="environment"` de los inputs
  de foto para poder elegir una foto ya existente de la galería, no solo
  la cámara — pensado para poder fotografiar algo sin cobertura y
  añadirlo a una comida más tarde.
- Se corrigieron varios sitios donde el servidor calculaba la hora/fecha
  con el reloj UTC de Vercel en vez de la hora real de Madrid (ver
  `CRITICAL_FLOWS.md` regla 9) — el saludo de Hoy fue el último caso
  encontrado.
- Se diagnosticó y arregló una causa real de lentitud general: cada
  carga de pantalla repetía `supabase.auth.getUser()` (una llamada de red
  real) más de 10 veces — confirmado en los logs de Supabase, no
  adivinado. `src/lib/supabase/server.ts` ahora memoiza `createClient()`
  y un `getUser()` compartido con `cache()` de React por request; el
  Coach IA ahora ejecuta en paralelo las tools de lectura que pide
  Gemini en un mismo turno en vez de una a una
  (`supabase/functions/ai-coach/index.ts`).
- Esta misma sesión: se corrigió documentación desactualizada
  (`ARCHITECTURE.md`/`DEPLOYMENT.md` seguían describiendo el login por
  magic-link ya eliminado; `DATABASE.md` no listaba la migración `0004`).

## Pendiente / no resuelto (dilo honestamente al usuario si te pregunta)

- El usuario reportó al menos una vez que la hora seguía sin verse bien
  incluso después de un fix verificado en producción — no se encontró
  una causa adicional con el código disponible (se revisó y descartó,
  con evidencia, que fuera caché agresiva de la PWA). Si vuelve a
  reportarlo, pide una captura de pantalla con la hora exacta mostrada
  vs. la hora real del móvil — sin eso no hay más pistas que seguir.
- El Coach IA no hace streaming de la respuesta (la UI espera el texto
  completo antes de mostrar nada) — es la limitación estructural
  restante de por qué el chat puede sentirse lento en preguntas que
  encadenan varias llamadas a Gemini. Añadir streaming es un cambio de
  arquitectura mayor (Edge Function + cliente), no un ajuste rápido.
- El usuario preguntó por sustituir Gemini por Claude (Haiku 4.5/Sonnet
  5) para quitar el límite diario gratuito de Gemini — quedó como
  posibilidad futura, no iniciado.
- El usuario preguntó por llevar el diseño a un nivel más "web
  profesional" usando herramientas visuales desde un ordenador (Figma,
  "Claude Design") — ver `DESIGN_REBUILD_MAP.md` → "Filosofía actual (y
  su techo conocido)".
- Gaps ya documentados y honestos (no ocultos): búsqueda USDA, bucle de
  aprendizaje de correcciones (`ai_corrections`), memoria estructurada
  del coach (`ai_memory`), adjuntar fotos guardadas a `meal_images`,
  notificaciones push reales, sync con Apple Health (imposible desde una
  PWA) — ver la lista completa en `README.md` y `AI.md`.

## Qué NO se incluye en este ZIP (y por qué)

- `node_modules/`, `.next/`, `*.tsbuildinfo` — reconstruibles con `npm
  install` / `npm run build`; incluirlos solo infla el archivo.
- `.env.local` y cualquier `.env*` real — nunca se comitean ni se
  entregan; usa `.env.example` como plantilla y `DEPLOYMENT.md` para
  saber de dónde sacar cada valor real.
- `.git/` — historial completo de commits; si necesitas el historial,
  pide acceso al repo de GitHub directamente en vez de depender de este
  ZIP.
- Ningún secreto/API key/token/contraseña real en ningún archivo — se
  comprobó explícitamente antes de generar este paquete (`git grep` por
  patrones de clave + `git check-ignore` sobre `.env.local`).
