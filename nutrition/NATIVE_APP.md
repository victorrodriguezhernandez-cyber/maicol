# App nativa iOS (Capacitor)

Además de la PWA, este proyecto tiene un contenedor nativo iOS real vía
[Capacitor](https://capacitorjs.com) en `ios/`. No es un export estático:
la webview del contenedor carga directamente la URL de producción
(`capacitor.config.ts` → `server.url`), así que sigue siendo el mismo
Next.js con Server Components, Server Actions, auth y RLS de siempre —
lo único que cambia es el contenedor en el que se ejecuta esa misma UI
en un iPhone. Nada de esto se puede compilar desde Linux: todo lo de
aquí en adelante necesita un Mac con Xcode instalado.

## Por qué esto existe

Un PWA instalado (Compartir → Añadir a pantalla de inicio) ya se abre
sin barra de Safari y con icono propio, pero sigue siendo técnicamente
una página web ejecutándose en el motor de Safari — no un proceso nativo
separado, no aparece en Ajustes → Apps, y algunas capacidades nativas
(notificaciones push fiables, ciertos permisos) no están disponibles.
Este contenedor Capacitor es un binario iOS real: proceso propio, icono
propio, entrada propia en Ajustes → Apps.

## Qué necesitas para compilarlo

- **Un Mac con Xcode** (gratis, App Store). Sin esto no hay forma de
  seguir — Apple no permite compilar para iOS desde Linux/Windows.
- **Un Apple ID normal, gratis**, para firmar el build en tu propio
  iPhone conectado por cable (o por red local con Xcode). Con esto
  puedes instalarlo y probarlo en tu iPhone sin pagar nada — con dos
  límites: el certificado de firma gratuito expira cada 7 días (hay que
  reabrir Xcode y volver a darle a ▶ para renovarlo) y solo puedes
  instalarlo así en dispositivos que tú mismo conectes y registres.
- **Opcional, solo si más adelante quieres TestFlight o subirla a la App
  Store**: una cuenta de Apple Developer Program (99$/año). TestFlight
  en sí **también exige esta cuenta de pago** — no hay una vía gratuita
  para TestFlight específicamente, a diferencia de "instalar en tu
  propio iPhone por cable" que sí es gratis.

## Cómo compilarlo y probarlo en tu iPhone

```bash
cd nutrition
npm install          # trae @capacitor/core, @capacitor/cli, @capacitor/ios
npm run cap:sync     # copia capacitor.config.ts -> ios/App/App/capacitor.config.json
npm run cap:open:ios # abre ios/App/App.xcodeproj en Xcode
```

Dentro de Xcode:

1. Conecta tu iPhone por cable (o añádelo como dispositivo inalámbrico
   la primera vez: Window → Devices and Simulators).
2. En el proyecto "App" → pestaña **Signing & Capabilities**: marca
   "Automatically manage signing" y elige tu Apple ID personal en
   **Team** (Xcode → Settings → Accounts para añadirlo si no está).
3. Arriba, en el selector de destino, elige tu iPhone (no un simulador).
4. Pulsa ▶ (Run). La primera vez tendrás que ir a tu iPhone → Ajustes →
   General → VPN y gestión de dispositivos → confiar en tu propio Apple
   ID como desarrollador.
5. El icono "Maicol" aparecerá en tu pantalla de inicio como cualquier
   otra app — proceso nativo real, no una pestaña de Safari.

Repite el paso 4 (▶ en Xcode) cada ~7 días si usas la firma gratuita —
si no, iOS deja de abrir el build automáticamente.

## Qué se pierde/gana frente a la PWA

- **Se gana**: proceso nativo real, icono en Ajustes → Apps, base para
  añadir capacidades nativas de verdad más adelante (push, biometría,
  etc. — ninguna implementada todavía, ver huecos honestos en
  `README.md`/`AI.md`).
- **Se mantiene igual**: toda la lógica de negocio, Supabase, RLS,
  Server Actions, el coach de IA — nada de eso cambia, la webview solo
  visita la misma URL de producción.
- **Pendiente si algún día se quiere publicar**: bundle ID definitivo
  (ahora mismo `com.maicol.nutricion`, elegido provisionalmente),
  capturas de pantalla, descripción de App Store, revisión de Apple, y
  la cuenta de pago mencionada arriba.

## Si cambia la URL de producción

Actualiza `server.url` en `capacitor.config.ts` y vuelve a correr
`npm run cap:sync` antes de recompilar en Xcode.
