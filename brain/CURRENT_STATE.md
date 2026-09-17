# Estado actual

> Sólo el PRESENTE. La historia está en Git y en `brain/sessions/`.

- **Fase:** Maicol — entreno: motor de progresión y prescripción
- **Estado:** en desarrollo; último trabajo funcional sin desplegar
- **Rama activa:** `claude/nutrition-ai-app-vj15u0`
- **Último agente:** claude
- **Último commit:** `58f9652`
- **Actualizado:** 2026-09-17

## El proyecto en cuatro líneas

Maicol Nutrición: PWA personal de nutrición + peso + entreno. La app vive
en `nutrition/` (Next.js 16, React 19, Supabase, Gemini, Tailwind v4,
Vitest, Playwright, Capacitor). **La raíz del repo contiene además una web
estática de trading que no se toca nunca** (`index.html`, `chart.js`,
`zones.js`, `supabase.js`, `el_sensei_espanol.pine`).

Reglas de negocio no negociables: `nutrition/CLAUDE.md`. Esquema y
migraciones: `nutrition/DATABASE.md`. IA: `nutrition/AI.md`.

## Terminado y desplegado

- Nutrición completa: diario, recetas, capturas (foto/voz/texto/etiqueta),
  objetivos adaptativos, coach IA con acciones propuestas.
- Entreno: rutinas, registro en directo, récords, mapa muscular, volumen.
- Registrar en días pasados con cualquier método de captura.
- Comidas desglosadas por ingrediente + botón "Desglosar" para las viejas.
- Modelo Gemini `gemini-3.5-flash-lite` con vuelta atrás automática.
- **Motor de progresión** (`nutrition/src/lib/training/progression.ts`):
  doble progresión + suelo de no-retroceso. Desplegado (main `8dafbbb`).
- `training_goals`: objetivo de entreno con hasta 3 focos e historial.
- Coach IA con tres herramientas de entreno (Edge Function `ai-coach` v15).

## En progreso (commit `58f9652`, en la rama, SIN desplegar)

- **`nutrition/src/lib/training/prescripcion.ts`**: el rango de
  repeticiones lo decide el ejercicio (músculo + mecánica + material) y el
  objetivo, no la rutina. Incluye modulación por déficit calórico leído de
  `nutrition_goals.mode`.
- Caso `recalibra` en el motor: cuando el peso está puesto para otro
  rango, se recalcula desde el máximo estimado (Epley) con tope del 20%.
- 165 tests en verde, tsc + eslint + build limpios.

## Pendientes

1. Desplegar `58f9652` (merge a `main` + redesplegar Edge Function
   `ai-coach`, porque `_shared/progresion.ts` y `_shared/prescripcion.ts`
   han cambiado). **Falta el visto bueno del usuario.**
2. Paso de objetivo de entreno en el onboarding (hoy sólo está en
   Ajustes → Objetivos).
3. Autorregulación dentro de la sesión: tras la primera serie, si el RIR
   es alto, sugerir subir peso ya en vez de esperar al próximo día.
4. Capa de IA opcional que lea la sesión y escriba una nota; los números
   seguirían saliendo del algoritmo.

## Bloqueos

- **El usuario tiene que hacer dos cosas en Supabase** (no se pueden hacer
  desde aquí): desactivar el registro público (Authentication → Sign In /
  Providers → Email → "Allow new users to sign up") y activar la
  protección de contraseñas filtradas.
- No hay token de Supabase en el entorno, así que los Edge Functions se
  despliegan por MCP inlineando los archivos a mano. Es caro y manual.

## Decisiones activas importantes

- `0001` La carga la decide un algoritmo, no la IA — **approved**
- `0002` El motor se duplica a mano en `supabase/functions/_shared/` — **approved**
- `0003` El rango de repeticiones se prescribe por ejercicio — **testing**
- `0004` Los scripts del cerebro viven en `nutrition/package.json` — **approved**

## Siguiente acción

Esperar a que el usuario diga si se despliega `58f9652`. Mientras tanto no
se toca nada de Maicol: la última instrucción fue crear el cerebro y
detenerse.
