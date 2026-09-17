---
type: decision
status: testing
origin: user
created: 2026-09-17
validated_by: "-"
area: entreno
---

# El rango de repeticiones lo decide el ejercicio y el objetivo

## Qué se propone

`nutrition/src/lib/training/prescripcion.ts` decide el rango mirando la
mecánica del ejercicio, el tamaño del músculo, el material, el objetivo
de entreno y si el usuario está en déficit calórico. La rutina se respeta
salvo que se aleje tres repeticiones o más.

## Por qué

El motor afinaba el peso contra el rango que ponía la rutina, y ese
número la primera vez se elige al azar. Afinar el peso contra un rango
inventado es afinar encima de un error.

Caso real que lo destapó: la rutina ponía 8-12 en un curl de muñeca. Para
antebrazo con objetivo de volumen lo que toca son 12-20, y con 8-12 el
peso correcto era otro.

## Estado

**`testing`, no `approved`.** Está escrito, probado (165 tests) y subido a
la rama, pero el usuario todavía no lo ha visto funcionando en su móvil.
No pasa a `approved` hasta que lo apruebe él.

## Riesgo conocido

La tabla de rangos es una convención de sala documentada con su margen de
error dentro del propio archivo: los metaanálisis de Schoenfeld indican
que se crece parecido entre 6 y 35 repeticiones si las series se llevan
cerca del fallo. El rango se elige por lo práctico, no porque fuera de él
no se crezca. Eso está escrito en el archivo, no sólo aquí.
