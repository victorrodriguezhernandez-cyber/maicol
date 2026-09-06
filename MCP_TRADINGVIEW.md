# Conectar Claude a TradingView (vía MCP)

## Por qué no es una API directa

TradingView **no ofrece una API pública** para leer datos de cuenta, valores
de indicador o el estado de un gráfico bajo demanda. Lo único que TradingView
expone hacia afuera son **alertas por webhook**: tú defines la condición (ya
está hecho en `el_sensei_espanol.pine`, ver los bloques `alertcondition()`),
y cuando se dispara, TradingView hace un `POST` a una URL que tú controlas.

Cualquier librería que diga "conectarse a la API de TradingView" para leer
velas o el book en vivo está usando endpoints internos no documentados (y
contra los Términos de Servicio) — no se recomienda ni se ha usado aquí.

Así que la forma legítima y estable de "conectar Claude a TradingView" es:

```
TradingView (alertcondition) --webhook POST--> api/tradingview-webhook.js
                                                        │
                                                        ▼
                                              Supabase: tabla tv_alerts
                                                        │
                                                        ▼
                                        mcp-server/ (MCP, stdio) ◄── Claude
```

Este repo ya trae las tres piezas. Solo falta que tú:

## 1. Crear la tabla en Supabase

En el proyecto de Supabase (el mismo que usa `supabase.js`), abre
**SQL Editor → New query**, pega y ejecuta `sql/tv_alerts.sql`.

## 2. Desplegar el webhook

`api/tradingview-webhook.js` ya está listo para Vercel (este repo ya se
despliega ahí, ver `vercel.json`). Configura en el proyecto de Vercel
(Settings → Environment Variables):

- `SUPABASE_URL` — la misma URL del proyecto.
- `SUPABASE_SERVICE_ROLE_KEY` — la clave `service_role` (Project Settings →
  API en Supabase). **Nunca** la clave pública/anon aquí: esta clave es la
  única con permiso de escritura, precisamente porque `tv_alerts` solo
  permite lectura pública por RLS.
- `TV_WEBHOOK_SECRET` — cualquier cadena secreta que tú elijas, para que
  nadie más pueda escribir alertas falsas en tu tabla.

Tras el deploy, tu endpoint queda en:
`https://<tu-dominio-vercel>/api/tradingview-webhook?secret=<TV_WEBHOOK_SECRET>`

## 3. Configurar la alerta en TradingView

Abre el indicador `EL SENSEI Español` en un gráfico, crea una alerta sobre
una de las condiciones (por ejemplo "BOS Alcista + Tasa MEDIO/ALTO"):

- **Webhook URL**: la de arriba.
- **Message** (formato JSON, TradingView sustituye los `{{placeholders}}`):

```json
{
  "ticker": "{{ticker}}",
  "timeframe": "{{interval}}",
  "alert_name": "BOS Alcista + Tasa MEDIO/ALTO",
  "action": "bos_bull",
  "price": {{close}},
  "message": "{{exchange}}:{{ticker}} — EL SENSEI: BOS alcista, tasa MEDIO/ALTO"
}
```

Repite por cada condición que quieras capturar, cambiando `alert_name` /
`action`.

## 4. Usar el MCP server desde Claude

Ver `mcp-server/README.md`. Con Claude Code, al abrir este repo ya se detecta
automáticamente vía `.mcp.json`. Prueba a preguntar:

- "¿Qué alertas ha mandado TradingView hoy?"
- "Dame el pulso del mercado."
- "¿Qué probabilidad histórica tiene una zona alcista de este tamaño?"
- "¿A cuánto está BTC ahora mismo?" / "Enséñame las últimas velas de 15m" —
  estas dos usan `get_live_price` / `get_live_candles`, que van directas a
  Binance (no a TradingView ni a Supabase), así que responden con el
  mercado en vivo sin depender de que hayas disparado una alerta.

## Verificación rápida sin esperar una alerta real

Puedes insertar una fila de prueba directamente en Supabase (Table editor →
`tv_alerts` → Insert row) y luego pedirle a Claude "muéstrame las últimas
alertas de TradingView" para confirmar que todo el cableado funciona antes de
depender de que se dispare una alerta real en el mercado.
