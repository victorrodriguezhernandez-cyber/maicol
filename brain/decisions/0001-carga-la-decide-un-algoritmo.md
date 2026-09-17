---
type: decision
status: approved
origin: claude
created: 2026-09-16
validated_by: user
area: entreno
---

# La carga que toca hoy la decide un algoritmo, no la IA

## Qué se decidió

`nutrition/src/lib/training/progression.ts` calcula el peso y las
repeticiones con doble progresión. La IA no elige números: como mucho los
narra.

## Por qué

Cuatro razones, en orden de peso:

1. **Justificable.** La regla 9 del proyecto exige que cualquier etiqueta
   de juicio se pueda explicar con el número exacto del que sale. El motor
   devuelve `detalle` con esas líneas. Un modelo redacta una explicación
   convincente que no siempre es la razón real.
2. **Estable.** El mismo historial da siempre la misma recomendación.
3. **Gratis e instantáneo.** La cuota de Gemini es escasa.
4. **Funciona desde el primer entreno**, sin memoria acumulada.

## Cómo se validó

El usuario preguntó explícitamente si era IA o algoritmo y aceptó el
criterio ("está bien la lógica"). Lo que rechazó después fue la
profundidad del algoritmo, no que fuera un algoritmo — ver `0003`.

## Consecuencia

Cualquier funcionalidad de "qué hago hoy" se resuelve con reglas
probadas. La IA se reserva para leer patrones largos y escribir texto.
