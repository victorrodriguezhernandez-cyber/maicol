# sensei-tradingview-mcp

Servidor MCP (Model Context Protocol) que da a Claude acceso de **solo lectura**
a los datos de TradingView de este proyecto:

- Alertas disparadas por `el_sensei_espanol.pine` en TradingView, capturadas
  por `../api/tradingview-webhook.js` en la tabla `tv_alerts` de Supabase.
- El historial de zonas (`zones_history`) que ya usa el dashboard (`../supabase.js`)
  para puntuar la probabilidad de un order block / FVG.

No ejecuta operaciones, no escribe nada: todas las tools son de lectura.

## Herramientas expuestas

| Tool | Qué hace |
|---|---|
| `get_recent_tv_alerts` | Últimas alertas recibidas desde TradingView (BOS, tasa de continuación, etc.) |
| `get_recent_zones` | Últimas zonas SENSEI detectadas (order blocks / FVG), con su resultado |
| `get_zone_probability` | Probabilidad histórica de que una zona se respete, dado tipo/tendencia/altura |
| `get_market_pulse` | Resumen combinado: últimas alertas + últimas zonas, de un solo vistazo |
| `get_live_price` | Precio y estadísticas 24h **en vivo**, directo de Binance (sin esperar a una alerta) |
| `get_live_candles` | Velas OHLCV recientes **en vivo**, directo de Binance — misma fuente que usa `index.html` |

Las dos últimas no dependen de TradingView en absoluto: TradingView no tiene
API para leer el gráfico en vivo, así que van directas a Binance (el
exchange del que TradingView saca los precios de `BINANCE:BTCUSDT`), que sí
es pública y gratuita.

## Instalación

```bash
cd mcp-server
npm install
```

Por defecto usa la misma URL/clave pública (`sb_publishable_...`) que ya está
en `../supabase.js` — de solo lectura gracias a la política RLS de
`sql/tv_alerts.sql`. Si quieres apuntar a otro proyecto de Supabase, copia
`.env.example` a `.env` y ajusta las variables.

Comprueba que arranca y responde:

```bash
npm run smoke
```

## Conectarlo a Claude Code / Claude Desktop

**Claude Code** (ya incluido en este repo vía `.mcp.json` en la raíz — al abrir
este proyecto con Claude Code, el servidor se detecta automáticamente).

**Claude Desktop** — añade esto a tu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sensei-tradingview": {
      "command": "node",
      "args": ["/ruta/absoluta/a/maicol/mcp-server/src/index.js"]
    }
  }
}
```

Reinicia Claude Desktop y pregunta, por ejemplo: *"¿qué alertas ha lanzado
TradingView en la última hora?"* o *"dame el pulso del mercado"*.

## Requisito previo: la tabla `tv_alerts` debe existir

Antes de que `get_recent_tv_alerts` devuelva algo, ejecuta una vez
`../sql/tv_alerts.sql` en el SQL editor de Supabase, y configura el webhook
de TradingView como se explica en `../MCP_TRADINGVIEW.md`.
