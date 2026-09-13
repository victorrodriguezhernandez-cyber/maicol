# Estado de entrega

Qué se hizo en el endurecimiento del proyecto, qué quedó verificado y qué
sigue abierto. Escrito para que alguien que llega nuevo sepa en qué punto
está la aplicación sin tener que reconstruirlo leyendo commits.

## Lo que está hecho y verificado

### Seguridad

| Qué | Cómo quedó comprobado |
|---|---|
| 8 Server Actions de borrado y `setDayStatus` dependían solo de RLS | Ahora comprueban sesión y validan entrada con Zod, igual que el resto |
| El email de la cuenta viajaba en el bundle público junto a `signInWithPassword` | Login movido a Server Action; test E2E descarga cada chunk servido y falla si reaparece |
| Vulnerabilidad alta (RCE en `serialize-javascript`, vía la cadena de build de la PWA) | Fijada a `^7.1.1` con `overrides`, sin degradar `next-pwa`; build verificado |
| No había ninguna cabecera de seguridad HTTP | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS — comprobadas en producción con `curl` y con test E2E |
| RLS nunca se había probado en vivo, solo leído | Probado con la clave anon contra la API real: lectura vacía, escritura rechazada (401 / `42501`) |
| Storage | Buckets no enumerables sin sesión; listado de objetos vacío |
| Edge Functions | Las 5 rechazan peticiones sin JWT (401) |
| Base de datos | Sin vistas que salten RLS; `handle_new_user` solo ejecutable por `postgres`/`service_role`; ninguna política con `auth.role()` o `user_metadata`; ninguna política `ALL`/`UPDATE` sin `WITH CHECK` |

### Errores

- No existía **ningún** error boundary. Ahora hay tres niveles
  (`(app)/error.tsx`, `registrar/error.tsx`, `global-error.tsx`) más un
  404 propio, todos con la API de Next.js 16 (`retry`, no `reset`).
- `/recetas/nueva` fallaba **en silencio**: `try/finally` sin `catch` y
  fuera de `startTransition`, así que ni lo capturaba nadie ni llegaba a un
  boundary. La receta entera se perdía sin mensaje.
- Guardar peso, medidas y objetivos ya no borra lo escrito si falla, y
  distingue "sin conexión" de "el servidor lo rechazó"
  (`src/lib/hooks/useActionRunner.ts`).

### Pruebas

- **39 tests unitarios** (Vitest). El entorno de tests de componentes
  estaba a medias: las librerías eran dependencias pero faltaba la peer
  `@testing-library/dom` y vitest solo miraba `.test.ts` en entorno node.
- **31 tests E2E** (Playwright, viewport iPhone, contra build de
  producción): 21 rutas privadas redirigen sin sesión, las APIs no sueltan
  datos, el email no vuelve al bundle, el navegador no habla con Supabase
  Auth, cabeceras, manifiesto, 404 y pantalla offline.

### Bugs encontrados de paso

1. **`npm run dev` no arrancaba.** Next.js 16 usa Turbopack por defecto y
   se niega a arrancar si encuentra config de webpack, que `next-pwa`
   siempre inyecta. Resuelto con `turbopack: {}`.
2. **`/~offline` estaba detrás del middleware de sesión**, contradiciendo
   la regla 10 de `CRITICAL_FLOWS.md`: sin red no se puede validar sesión,
   así que un fallo de caché estando offline mandaba a `/login`, la única
   pantalla que tampoco carga sin red.

## Lo que sigue abierto

### Requiere acción en el panel de Supabase (no se puede hacer por código)

- 🔴 **Registro público abierto** (`disable_signup: false`). Cualquiera
  puede crear una cuenta en el proyecto y consumir la cuota de Gemini.
  RLS impide que vea datos ajenos. Hay fricción (exige confirmar un email
  real) pero un correo temporal la salva.
  *Authentication → Sign In / Providers → Email → desactivar "Allow new
  users to sign up".*
- 🟡 **Protección de contraseñas filtradas desactivada.**
  *Authentication → Password settings.*

### Requiere una decisión

- **Sentry**: no instalado. Recomendación: sí a monitorización de errores
  (es la única forma de enterarse de un fallo en el móvil del usuario), y
  **no** a Session Replay, que grabaría peso, medidas y comidas —datos de
  salud— hacia un tercero. Hace falta crear la cuenta y aportar el DSN.
- **Límite de uso de la IA**: las Edge Functions no tienen throttling. La
  causa raíz del abuso es el registro abierto; cerrándolo, el riesgo baja
  a "token de sesión robado". Implementarlo es viable sin migración nueva,
  contando filas recientes en `ai_analyses`, pero el umbral es una
  decisión de producto.

### Trabajo técnico pendiente

- **Rendimiento / Core Web Vitals**: sin auditar.
- **Accesibilidad**: sin auditar. Solo ~15% de los archivos fuente tiene
  algún atributo de accesibilidad.
- **~10 componentes** (botones de borrar, chat del Coach, subir foto) se
  apoyan solo en el error boundary, sin aviso en línea.
- **E2E autenticados**: los 31 tests actuales no pueden entrar en la app
  porque no hay credenciales de prueba. Con una cuenta de QA se podrían
  cubrir registro de comidas, foto, voz, recetas, peso y Coach.
- **Safari**: los E2E corren sobre Chromium; no cubren bugs específicos
  del motor real del iPhone.

## Vigilar al tocar esto

`CRITICAL_FLOWS.md` sigue siendo la referencia de invariantes. Los dos
añadidos en esta ronda:

- El email de la cuenta **nunca** vuelve a un componente `"use client"`.
- `/~offline` **nunca** vuelve a quedar detrás del middleware de sesión.

Ambos tienen un test E2E que falla si se rompen.
