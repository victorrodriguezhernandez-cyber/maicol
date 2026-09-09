# Mapa de diseño — dónde vive cada cosa, y por dónde rehacerla

Este documento es para un agente que necesite entender o rediseñar la
capa visual sin releer todo `src/` a ciegas. No repite lo que ya está en
`ARCHITECTURE.md` (estructura de rutas) — se centra en tokens,
primitivas compartidas y qué archivo toca cada pantalla.

## Filosofía actual (y su techo conocido)

El diseño actual es deliberadamente minimalista: superficies de cristal
(`glass-panel`), un fondo con tres manchas de color radiales muy suaves
detrás de todo, una sola familia monoespaciada para cualquier cifra
(kcal/macros/kg/fechas) como firma tipográfica del proyecto, y colores
semánticos por métrica (proteína/carbos/grasa/fibra/peso) en vez de un
único acento repetido en todo.

**Esto tiene un techo reconocido explícitamente por el usuario**: "por
mucho que mejores la difuminación y tal, no queda como una web
profesional". El usuario preguntó por usar Figma o "Claude Design" desde
un ordenador (no un móvil) para llevar el diseño más allá de lo que un
agente de código, trabajando solo con CSS/Tailwind y sin herramientas
visuales, puede conseguir de forma realista. Si te piden seguir subiendo
el nivel visual, esa es la vía a proponer primero — no seguir iterando
solo con más blur/gradientes sobre la base actual.

## Sistema de color (`src/app/globals.css`)

Todo vive en custom properties CSS, redefinidas tres veces (base
`:root`, `@media (prefers-color-scheme: dark)`, y `:root[data-theme="dark"]`
para el toggle manual) — nunca un color hardcodeado fuera de este archivo
si se puede evitar.

| Token | Rol |
|---|---|
| `--app-bg` / `--surface` / `--surface-2` / `--surface-raised` | fondo de página / tarjeta plana / tarjeta ligeramente distinta / tarjeta elevada |
| `--border` / `--border-soft` | borde normal / borde casi invisible (divisores de lista) |
| `--text-primary` / `--text-secondary` / `--text-tertiary` | jerarquía de texto, tres niveles, nunca un cuarto |
| `--accent` / `--accent-fg` / `--accent-soft` | color de marca — reservado para acciones/elementos interactivos, NO para decorar datos |
| `--danger` / `--success` / `--warning` | estado semántico genérico |
| `--metric-protein` / `--metric-carbs` / `--metric-fat` / `--metric-fiber` / `--metric-weight` (+ `-soft`) | un color fijo por concepto nutricional/de peso — usado en `MacroChip`, `MacroInline`, `RingProgress`, `WeightChart`. Si añades una métrica nueva, dale su propio token aquí, no reutilices `--accent`. |
| `--shadow-sm` / `--shadow-md` | sombra tintada hacia `--shadow-color` (no negro puro) — usada solo donde algo "flota" de verdad (composer, FAB, tarjetas de decisión), nunca en todas las tarjetas |

Modo oscuro: dado por descontado en cada pantalla nueva. Si escribes un
color a mano en vez de un token, ya está mal.

## Primitivas compartidas (`globals.css`, clases, no componentes)

- `.btn-primary` / `.btn-secondary` — las dos únicas voces de botón de
  toda la app (gradiente elevado vs. cristal translúcido). No inventes un
  tercer estilo de botón por pantalla.
- `.glass-panel` — la superficie "flotante" (Volumen en Hoy, tarjetas de
  decisión del coach, historial de chats). Gradiente + `backdrop-filter:
  blur(20px)`, no un `background` plano.
- `.tap-row` — feedback de opacidad al tocar una fila de una lista
  dividida (ajustes, recetas, exportar).
- `.font-numeric` — Plex Mono + `tabular-nums` para CUALQUIER cifra que
  sea una medición (kcal, g, kg, horas). Es la única firma tipográfica
  deliberada del proyecto — no la olvides en un componente nuevo que
  muestre un número.
- `.safe-top` / `.safe-bottom` / `.safe-x` — `env(safe-area-inset-*)`
  para el notch/home-indicator del iPhone en modo PWA standalone.

## Componentes UI genéricos (`src/components/ui/`)

| Componente | Qué es | Usado en |
|---|---|---|
| `MacroChip.tsx` | proteína/carbos/grasa/fibra como chip compacto con barra de progreso | Hoy, `/diario/[date]` |
| `MacroInline.tsx` | la misma info en una línea (punto de color + "prot./carb./grasa") | listas de comidas, `MealComposer`, `MealItemRow`, recetas |
| `RingProgress.tsx` | anillo SVG de progreso (kcal del día en Hoy) | Hoy |
| `ProgressBar.tsx` | barra lineal de progreso | varios formularios/resúmenes |
| `Sheet.tsx` | bottom sheet compartido (usado por `RegisterSheet` y similares) | flujo Registrar |
| `EmptyState.tsx` | estado vacío homogéneo ("Sin X todavía") | cualquier lista que pueda estar vacía |
| `MealTypeIcon.tsx` | icono por tipo de comida (desayuno/comida/cena/snack/otro) | listas de comidas |

## Componentes por dominio

- `src/components/register/` — `MealComposer.tsx` (la pantalla de
  revisión compartida por TODOS los flujos de captura — ver
  `CRITICAL_FLOWS.md` regla 1) y `RegisterSheet.tsx` (el menú "Registrar"
  del bottom sheet).
- `src/components/coach/` — `ChatCoach.tsx` (todo el chat: burbujas,
  tarjetas de propuesta/confirmación, historial) y
  `AdaptiveGoalCard.tsx` (sugerencia de objetivo en `/ia`).
- `src/components/progress/` — formularios y gráficos de `/progreso`
  (`WeightChart.tsx` usa `lightweight-charts`, `WeightLogForm.tsx`,
  `MeasurementForm.tsx`, `ProgressPhotoUploader.tsx`).
- `src/components/settings/` — todos los formularios de `/ajustes`
  (`GoalEditorForm.tsx`, `PreferencesForm.tsx`, `SetPasswordForm.tsx`,
  `DeleteFoodButton.tsx`, `SignOutButton.tsx`).
- `src/components/dashboard/` — piezas de Hoy/Diario que no encajan en
  `ui/` genérico (`DayStatusPicker.tsx`, `MealItemRow.tsx`,
  `DeleteMealButton.tsx`).
- `src/components/nav/BottomNav.tsx` — la navegación inferior fija (Hoy,
  Diario, Registrar, Progreso, Coach IA, y el acceso a Ajustes vía el
  avatar del header, ver `(app)/layout.tsx`).
- `src/components/offline/OfflineSyncBoundary.tsx` — indicador/disparador
  de sincronización de comidas pendientes (ver `CRITICAL_FLOWS.md`
  regla 10).

## Mapa pantalla → archivo(s)

| Pantalla | Archivo(s) principal(es) |
|---|---|
| Hoy | `src/app/(app)/page.tsx` |
| Diario (lista de días) | `src/app/(app)/diario/page.tsx` |
| Diario de un día | `src/app/(app)/diario/[date]/page.tsx` |
| Detalle de una comida | `src/app/(app)/diario/comida/[id]/page.tsx` |
| Progreso (peso/medidas/fotos) | `src/app/(app)/progreso/{page,fotos/page,medidas/page}.tsx` |
| Coach IA | `src/app/(app)/ia/page.tsx` + `ChatCoach.tsx` |
| Recetas | `src/app/(app)/recetas/{page,[id]/page,nueva/page}.tsx` |
| Ajustes (índice + subpáginas) | `src/app/(app)/ajustes/{page,objetivos,alimentos,perfil,seguridad}/page.tsx` |
| Layout general (header + bottom nav) | `src/app/(app)/layout.tsx` |
| Login | `src/app/(auth)/login/page.tsx` |
| Onboarding | `src/app/onboarding/page.tsx` |
| Flujos de captura (Registrar) | `src/app/registrar/{manual,buscar,foto,etiqueta,texto,voz,receta,favoritos}/page.tsx`, todos convergen en `MealComposer.tsx` |
| Fallback offline (PWA) | `src/app/~offline/page.tsx` |

## Si vas a rediseñar de verdad

Orden recomendado, de menor a mayor riesgo de romper algo:

1. **Tokens** (`globals.css` `:root` + los dos bloques dark) — cambiar
   aquí se propaga solo, sin tocar componentes.
2. **Primitivas** (`.btn-primary`, `.glass-panel`, etc.) — igual de
   propagable, pero revisa visualmente varias pantallas después.
3. **Componentes `ui/`** — impacto medio, usados en muchos sitios; cambia
   uno, mira dónde se usa (`grep -rn "MacroChip" src`, etc.) antes de dar
   por bueno el cambio.
4. **Pantallas individuales** — el riesgo más bajo de romper otra cosa,
   pero el que menos "escala": si haces algo que se ve mejor, considera
   si merece subir a una primitiva en vez de quedar solo ahí.

No toques `index.html`/`chart.js`/`zones.js`/`el_sensei_espanol.pine` en
la raíz del repo — es una web estática de trading sin relación con esta
app (ver `ARCHITECTURE.md` → "Shared Supabase project").
