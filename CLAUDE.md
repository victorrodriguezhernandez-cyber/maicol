# CLAUDE.md — Proyecto XAU/USD Zonas Estadísticas

## Qué es este proyecto

Sistema profesional de análisis estadístico de zonas de trading intradiario para XAU/USD.
Detecta zonas supply/demand y niveles H/L en TradingView, manda los datos a n8n via webhook,
n8n calcula probabilidades históricas consultando Supabase, y el resultado se muestra en el gráfico.

## Stack

- **TradingView** — Pine Script v6 — detección de zonas y visualización
- **n8n Cloud** — `victorrh2008.app.n8n.cloud` — procesamiento y cálculo
- **Supabase** — proyecto `Maicol` (`pyiukqeuaxonsrrgbfzq`, región eu-west-1) — base de datos
- **Twelve Data** — API gratuita — precio en tiempo real para schedulers

## Credenciales conocidas

```
Supabase URL:      https://pyiukqeuaxonsrrgbfzq.supabase.co
Supabase anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aXVrcWV1YXhvbnNycmdiZnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNTQ2MjIsImV4cCI6MjA5NTkzMDYyMn0.bdGYK59jrIj_8E5ySDmzc7WdRL7e6GQaugq4-dvRoM4
n8n URL:           https://victorrh2008.app.n8n.cloud
Twelve Data key:   PENDIENTE (gratis en twelvedata.com)
```

## Base de datos Supabase — tablas creadas

### `zonas_historial`
Historial diario de resultados de zonas. Crece cada día a las 21h automáticamente.
```sql
id, fecha, activo, timeframe, tipo_zona (supply/demand),
precio_zona_suelo, precio_zona_techo, direccion_precio,
resultado (respeto_fuerte/respeto_debil/rompio/sin_reaccion),
sesion (london/new_york/asia/overlap), created_at
```

### `niveles_historial`
Historial de niveles H/L y si fueron rotos.
```sql
id, fecha, activo, timeframe, tipo_nivel (H/L),
precio, fue_roto (boolean), sesion, created_at
```

### `analisis_actual`
Fila única (id=1) con el análisis del momento actual. n8n la actualiza constantemente.
```sql
id (siempre 1), activo, tipo_zona, precio_zona_suelo, precio_zona_techo,
direccion_precio, prob_respeto_fuerte, prob_respeto_debil, prob_rompio,
casos_totales, muestra_suficiente, nivel_arriba_tipo, nivel_arriba_precio,
nivel_arriba_prob_ruptura, nivel_arriba_casos, nivel_abajo_tipo,
nivel_abajo_precio, nivel_abajo_prob_soporte, nivel_abajo_casos,
score_confluencia, fase (LEJOS/ACERCANDO/EN_ZONA), updated_at
```

## Archivos del proyecto

Todos en `/trading/`:

| Archivo | Descripción |
|---------|-------------|
| `sensei_zones_n8n.pine` | Pine Script v6 — código principal para TradingView |
| `wf1_sensei_webhook.json` | n8n WF1 — recibe webhook, calcula probabilidades, escribe en Supabase |
| `wf2_sensei_30min.json` | n8n WF2 — scheduler cada 30min, recalcula fase |
| `wf3_sensei_cierre.json` | n8n WF3 — scheduler 21:00, guarda resultado del día en historial |
| `INSTRUCCIONES.md` | Guía completa de configuración |

## Lógica de detección de zonas (Pine Script)

Basada en el indicador original del usuario "SENSEI VISUAL ZONES v0.6.1":

### Zona Supply (venta)
- Ventana de `zoneBars` velas con rango total ≤ `maxZoneATR × ATR(14)` → zona compacta
- Movimiento bajista posterior ≥ `minMoveATR × ATR(14)` → impulso confirmado
- Precio actual por debajo del suelo de la zona → zona activa
- Si precio cierra por encima del techo + 0.1×ATR → zona invalidada

### Zona Demand (compra)
- Misma lógica pero en dirección contraria (impulso alcista, precio por encima)

### Niveles H / L
- `H` = pivot high más cercano por encima del precio actual
- `L` = pivot low más cercano por debajo del precio actual
- Calculados con `ta.pivothigh/pivotlow` con `pivotLen` velas a cada lado
- Filtros: edad ≤ `levelLookback`, distancia ≤ `maxDistATR × ATR`, gap mínimo `minGapATR × ATR`

## Payload webhook que manda Pine Script a n8n

```json
{
  "activo": "XAUUSD",
  "precio_actual": 3305.40,
  "atr": 8.2341,
  "supply_zone_top": 3325.50,
  "supply_zone_bot": 3318.20,
  "demand_zone_top": 3290.10,
  "demand_zone_bot": 3282.50,
  "nivel_h": 3340.00,
  "nivel_l": 3275.00
}
```

## Flujo completo

```
TradingView (Pine Script)
  → Detecta supply/demand zone + nivel H/L
  → Cada 30min L-V 14:00-21:00 (hora España)
  → Dispara alerta con payload JSON
    ↓
n8n Workflow 1 (webhook)
  → Parsea zona activa y calcula fase (LEJOS/ACERCANDO/EN_ZONA)
  → Consulta zonas_historial para supply y demand por separado
  → Consulta niveles_historial para H y L
  → Calcula probabilidades: % respeto_fuerte / respeto_debil / rompio
  → Calcula score confluencia (zona 60% + nivel 40%)
  → Escribe en analisis_actual (upsert id=1)
  → Responde OK con fase y score
    ↓
n8n Workflow 2 (scheduler cada 30min)
  → Obtiene precio actual de Twelve Data
  → Recalcula fase (LEJOS/ACERCANDO/EN_ZONA)
  → Actualiza analisis_actual.fase
    ↓
n8n Workflow 3 (scheduler 21:00 L-V)
  → Lee analisis_actual
  → Descarga velas 1H del día de Twelve Data
  → Evalúa si la zona fue respetada o rota
  → Inserta registro en zonas_historial
  → Inserta registro en niveles_historial
  → Resetea fase a LEJOS en analisis_actual
```

## Panel que se ve en TradingView

Esquina superior derecha del gráfico:
```
SENSEI ZONES
○ LEJOS
── SUPPLY  3318.20 - 3325.50
   R.Fuerte 0.0%  R.Debil 0.0%  Rompio 0.0% [0]
   ! muestra insuficiente
── DEMAND  3282.50 - 3290.10
   Sin historial aun
── H  3340.00
── L  3275.00
```
Los valores se actualizan manualmente en los inputs del indicador tras cada ejecución de n8n.

## Estado actual del proyecto

### ✅ Completado
- [x] Tablas Supabase creadas (zonas_historial, niveles_historial, analisis_actual)
- [x] Pine Script v6 completo y funcional (sin errores de sintaxis)
- [x] 3 workflows n8n en JSON listos para importar
- [x] Lógica de detección adaptada al código original del usuario
- [x] Payload webhook definido y compatible con los 3 workflows

### ⏳ Pendiente (acciones manuales ~10 min)
- [ ] Importar wf1_sensei_webhook.json en n8n
- [ ] Importar wf2_sensei_30min.json en n8n
- [ ] Importar wf3_sensei_cierre.json en n8n
- [ ] Sustituir `PON_AQUI_TU_TWELVE_DATA_KEY` en WF2 y WF3
- [ ] Activar los 3 workflows en n8n
- [ ] Pegar sensei_zones_n8n.pine en TradingView Pine Editor
- [ ] Crear alerta en TradingView apuntando a URL del WF1
- [ ] Obtener API key gratuita en twelvedata.com

### 🔜 Próximo paso importante
- [ ] Script Python de backtesting para poblar zonas_historial con ~90 zonas reales
  - Descarga velas XAU/USD en 5M, 15M y 1H (hasta 800 días con Twelve Data gratis)
  - Detecta zonas supply/demand con la misma lógica del Pine Script
  - Evalúa vela por vela qué pasó con cada zona
  - Clasifica resultado: respeto_fuerte / respeto_debil / rompio / sin_reaccion
  - Guarda distancia del movimiento, magnitud, sesión
  - Inserta todo en zonas_historial y niveles_historial
  - Al terminar: base de datos sólida → probabilidades reales desde el primer día

## Configuración de TradingView

### Inputs del indicador — sección "Estadisticas n8n"
Estos valores se actualizan manualmente consultando la tabla `analisis_actual` en Supabase:

| Input | Campo en Supabase |
|-------|------------------|
| Supply: % Respeto fuerte | `sz_resp_f` |
| Supply: % Respeto débil | `sz_resp_d` |
| Supply: % Rompió | `sz_rompio` |
| Supply: Casos totales | `sz_casos` |
| Demand: % Respeto fuerte | `dz_resp_f` |
| Demand: % Respeto débil | `dz_resp_d` |
| Demand: % Rompió | `dz_rompio` |
| Demand: Casos totales | `dz_casos` |
| Nivel H: % Ruptura | `nivel_arriba_prob_ruptura` |
| Nivel L: % Soporte | `nivel_abajo_prob_soporte` |
| Score confluencia | `score_confluencia` |
| Fase | `fase` |

### Alerta TradingView
- Condición: `Sensei n8n XAU/USD`
- Webhook URL: URL del Workflow 1 de n8n (copiar tras importar)
- Frecuencia: Once per bar close
- Mensaje: dejar vacío (Pine Script genera el JSON)

## Notas técnicas importantes

1. **analisis_actual tiene siempre id=1** — se hace upsert, nunca insert nuevo
2. **Los workflows usan la anon key hardcodeada** — no requieren credenciales configuradas en n8n
3. **Pine Script no puede leer Supabase directamente** — los inputs del panel se actualizan manualmente
4. **La fase se recalcula cada 30min** aunque la zona no cambie
5. **El historial crece solo cada día a las 21:00** — no hay intervención manual
6. **Muestra suficiente = 15 casos** — el panel avisa si hay menos
7. **Score = zona×60% + nivel×40%** — ponderación definida en WF1 nodo "Calcular Probabilidades"

## Rama de desarrollo

Branch: `claude/vigilant-wright-yUVG7`
Repo: `victorrodriguezhernandez-cyber/maicol`
