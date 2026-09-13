# Maicol Nutrición

Aplicación personal de nutrición, peso y volumen con IA — un sustituto de
MyFitnessPal/Yazio/MacroFactor adaptado a un único usuario, con captura de
comidas por foto, etiqueta, texto y voz, seguimiento de
peso con tendencia (no picos diarios), y un asistente de IA que responde
sobre tus propios datos.

Ver también: [ARCHITECTURE.md](./ARCHITECTURE.md) ·
[DATABASE.md](./DATABASE.md) · [AI.md](./AI.md) ·
[DEPLOYMENT.md](./DEPLOYMENT.md) · [CLAUDE.md](./CLAUDE.md)

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, PWA
  ([@ducanh2912/next-pwa](https://github.com/DuCanhGH/next-pwa)).
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions).
- **IA**: Gemini (multimodal), llamado exclusivamente desde Edge Functions
  server-side — la API key nunca llega al navegador.
- **Despliegue**: Vercel (frontend) + Supabase (backend/IA).

## Estado de este proyecto

Este es un V1 real y funcional, no una demo. Todo lo que hay descrito en
este README y en `ARCHITECTURE.md` como "implementado" funciona de verdad
contra la base de datos real del proyecto Supabase — no hay datos ni
respuestas de IA simuladas en ningún punto de la aplicación.

### Entreno

El apartado de fuerza es completo y funciona contra la misma base de datos:

- **Catálogo de 129 ejercicios** cubriendo los 17 grupos musculares, cada
  uno con sus instrucciones de ejecución. Se filtra por músculo, material
  y tipo. Puedes crear los tuyos propios.
- **Rutinas** con días, ejercicios, series objetivo, rango de
  repeticiones, RIR, descanso y superseries. Cuatro formas de crear una:
  a mano, desde plantilla, contándoselo a la IA, o fotografiando la que ya
  sigues.
- **Registro en directo** con la tabla SERIE · PREVIA · KG · REPES, la
  columna "previa" con lo que hiciste la última vez, notas por serie,
  tipos de serie (calentamiento, dropset, backoff, al fallo) y cronómetro
  de descanso.
- **Récords** por ejercicio: más peso, más repeticiones, máximo estimado
  (Epley, sólo hasta 12 repeticiones porque a partir de ahí la fórmula
  deja de ser fiable) y mejor sesión. Se avisan en el momento de batirlos.
- **Mapa muscular en SVG propio** — no es arte copiado ni una imagen
  recortada — con el volumen semanal de cada grupo y su evolución en ocho
  semanas.
- **Cada etiqueta se puede justificar.** Al tocar "volumen alto" o
  "por debajo del mínimo" se abre el número exacto, el rango con el que
  se compara, de dónde sale ese rango, cómo se cuentan las series y la
  advertencia de que son medias de población con mucha variación
  individual.

Lo que **no** tiene el apartado de entreno, dicho igual de claro:

- El cronómetro de descanso **no suena ni vibra**: `navigator.vibrate` no
  existe en Safari de iOS y el audio automático está bloqueado sin
  interacción previa. Un aviso que falla la mitad de las veces es peor
  que no tenerlo, así que el aviso es visual (el contador se pone en rojo
  y crece).
- No hay gráfica de progresión de carga por ejercicio; sí el historial
  completo en lista y las barras de volumen semanal por músculo.
- Las plantillas de rutina traen los días, no los ejercicios: rellenarlas
  con ejercicios concretos sin saber qué material tienes sería exactamente
  el tipo de funcionalidad que aparenta funcionar y no funciona.

### Lo que no está incluido en este V1

Documentado explícitamente, no oculto:

- Sincronización con Apple Health (imposible desde una PWA — ver sección
  "Apple Health" de `ARCHITECTURE.md`).
- Notificaciones push reales (la infraestructura PWA lo permite; los
  disparadores concretos de negocio están pendientes).
- El resumen semanal narrado por IA (sí existe el análisis adaptativo de
  objetivos; un resumen conversacional de la semana es una extensión
  natural del mismo endpoint, pendiente).
- Adjuntar las fotografías de una comida a `meal_images` tras guardarla
  (el análisis y la revisión sí usan la foto; la persistencia del archivo
  en el diario queda para una iteración siguiente).

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # rellena con tus credenciales (ver DEPLOYMENT.md)
npm run dev
```

Abre http://localhost:3000. Para probarlo como PWA en tu iPhone, despliega
en Vercel (ver `DEPLOYMENT.md`) y añade la web a la pantalla de inicio desde
Safari — `next dev` desactiva el service worker a propósito.

## Scripts

| Comando           | Qué hace                                          |
| ------------------ | -------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo (Turbopack, PWA desactivada) |
| `npm run build`     | Build de producción (usa `--webpack`, ver nota abajo) |
| `npm run start`     | Sirve el build de producción                       |
| `npm run lint`      | ESLint                                              |
| `npm run test`      | Unit tests (Vitest)                                 |
| `npm run test:e2e`  | Tests end-to-end (Playwright, viewport de iPhone)   |
| `npm run test:watch`| Unit tests en modo watch                            |

> **Nota sobre Turbopack**: Next.js 16 usa Turbopack por defecto, pero el
> plugin de PWA (`@ducanh2912/next-pwa`) todavía depende de Workbox sobre
> webpack para generar el service worker en el build de producción. Por
> eso `npm run build` fuerza `--webpack`; `npm run dev` sigue usando
> Turbopack (la PWA está desactivada en desarrollo, así que no hay
> conflicto).

## Variables de entorno

Ver [`.env.example`](./.env.example) para la lista completa y
[DEPLOYMENT.md](./DEPLOYMENT.md) para cómo obtener cada valor.

## Base de datos e infraestructura ya provisionadas

Este repositorio comparte el proyecto Supabase `Maicol`
(`pyiukqeuaxonsrrgbfzq`) con otra aplicación (una plataforma de trading,
`SENSEI ZONES`, que vive en la raíz de este mismo repositorio Git y no
tiene relación con esta app de nutrición). El esquema de esta app vive
íntegramente bajo las tablas descritas en `DATABASE.md` y no interfiere con
las tablas de esa otra aplicación. Ver `ARCHITECTURE.md` para más detalle.
