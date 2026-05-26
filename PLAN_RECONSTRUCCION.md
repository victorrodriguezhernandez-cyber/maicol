# PLAN DE RECONSTRUCCIÓN — El Sensei Pro

## Decisión arquitectural

No hay código previo que conservar. Se diseña el indicador desde cero con la mejor arquitectura posible para Pine Script v5.

---

## 1. PARTES DEL CÓDIGO ACTUAL QUE SE CONSERVAN

**Ninguna** — el repositorio estaba vacío. Construcción completa desde cero.

---

## 2. PARTES QUE SE REHACEN / CREAN

Todo es nuevo:
- Detección de estructura (pivots + HH/HL/LH/LL + BOS + CHoCH)
- Detección de Order Blocks
- Detección de FVG
- Motor de probabilidades estadísticas
- Panel de tabla
- Sesiones
- MTF
- Alertas
- Estrategia de backtesting

---

## 3. MÓDULOS NUEVOS NECESARIOS

| Módulo | Función | Prioridad |
|--------|---------|-----------|
| `struct_module` | Pivots, HH/HL/LH/LL, tendencia, estado | CRÍTICA |
| `bos_choch_module` | Detección BOS y CHoCH, dibujo | CRÍTICA |
| `ob_module` | Order Blocks locales y MTF | CRÍTICA |
| `stats_module` | Cálculo de tasa continuación y retests | CRÍTICA |
| `fvg_module` | Fair Value Gaps | ALTA |
| `session_module` | Sesiones con fondo y líneas | MEDIA |
| `panel_module` | Tabla del panel de control | CRÍTICA |
| `alert_module` | Alertas sin strings dinámicos | MEDIA |

---

## 4. CÓMO DETECTAR ESTRUCTURA

```
Herramienta: ta.pivothigh() y ta.pivotlow()
Parámetros: leftBars (default 10), rightBars (default 10)
Retraso: rightBars barras (confirmación real, sin repintado)

Lógica HH/HL/LH/LL:
- Nuevo pivot high > último pivot high → HH
- Nuevo pivot high < último pivot high → LH
- Nuevo pivot low > último pivot low → HL
- Nuevo pivot low < último pivot low → LL

Variables var:
- lastPH, lastPL: último pivot confirmado
- prevPH, prevPL: el anterior a ese
- lastHH, lastHL, lastLH, lastLL: valores actuales

Conteo de máximos/mínimos válidos:
- En alcista: conteo de HH + HL desde último CHoCH
- En bajista: conteo de LH + LL desde último CHoCH
```

---

## 5. CÓMO DETECTAR TENDENCIA

```
Alcista: último pivot high es HH Y último pivot low es HL
Bajista: último pivot high es LH Y último pivot low es LL
Neutral: mezcla (HH pero LL, o LH pero HL)

Estado:
- "Confirmado alcista" → tendencia alcista + tasa > 55%
- "Confirmado bajista" → tendencia bajista + tasa > 55%
- "Validando máximo" → esperando confirmación de nuevo HH
- "Validando mínimo" → esperando confirmación de nuevo HL
- "Neutralización" → tasa ≈ 45-55% o TF pequeño contradice
```

---

## 6. CÓMO DETECTAR MÁXIMOS Y MÍNIMOS VÁLIDOS

```
Máximos válidos = cantidad de swing highs que están dentro de la 
  estructura actual (desde el último CHoCH hasta ahora)

Mínimos válidos = cantidad de swing lows dentro de estructura actual

Implementación:
- var int validHighs = 0
- var int validLows = 0
- Resetear al detectar CHoCH
- Incrementar al confirmar nuevo pivot en dirección correcta
```

---

## 7. CÓMO DETECTAR HH, HL, LH, LL

```pine
// En cada pivot high confirmado:
if not na(ph)
    isHH := ph > nz(lastPH, 0)
    isLH := ph < nz(lastPH, 999999)
    prevPH := lastPH
    lastPH := ph

// En cada pivot low confirmado:
if not na(pl)
    isHL := pl > nz(lastPL, 0)
    isLL := pl < nz(lastPL, 999999)
    prevPL := lastPL
    lastPL := pl
```

---

## 8. CÓMO DETECTAR BOS Y CHoCH

```
BOS (Break of Structure):
- BOS alcista: close > lastPH (cuando tendencia ya es alcista)
- BOS bajista: close < lastPL (cuando tendencia ya es bajista)

CHoCH (Change of Character):
- CHoCH alcista: close > lastPH (cuando tendencia ERA bajista)
- CHoCH bajista: close < lastPL (cuando tendencia ERA alcista)

La diferencia: BOS = continúa, CHoCH = cambia tendencia

Dibujo:
- Línea horizontal desde punto de ruptura
- Label "BOS" o "CHoCH" en el extremo
- Color diferente para cada tipo
- Solo si showBOS / showCHoCH inputs están activos
```

---

## 9. CÓMO DETECTAR ZONAS GRISES (OBs)

```
Order Block bajista (zona de oferta/roja):
- Busca la última vela alcista ANTES de un BOS bajista
- Top = max(open, close) de esa vela
- Bottom = min(open, close) de esa vela
- Se dibuja como box rojo semi-transparente

Order Block alcista (zona de demanda/azul):
- Busca la última vela bajista ANTES de un BOS alcista  
- Top = max(open, close) de esa vela
- Bottom = min(open, close) de esa vela
- Se dibuja como box azul semi-transparente

Estado de OB:
- Fresco: precio no ha retornado a la zona
- Usado: precio entró en la zona (pero no cerró fuera)
- Invalidado: precio cerró completamente fuera del OB

Máximo de OBs activos: configurable (default 5)
Arrays: obTop[], obBottom[], obBar[], obActive[], obIsBull[], obFresh[]

Actualización cada barra:
- Si close < obBottom[i] para OB alcista → invalidar
- Si close > obTop[i] para OB bajista → invalidar
- Si price entró en zona → marcar como "usado"
```

---

## 10. CÓMO CALCULAR PORCENTAJES (Fórmula Sensei)

```
Aproximación de la fórmula: "90 zonas × 30 BOS ÷ 5 formas"

Implementación práctica:

PASO 1: Definir "zona similar"
- Mismo tipo (alcista/bajista)
- Tamaño de zona (top - bottom) dentro de ±pipVar pips del tamaño actual

PASO 2: Lookback 90 zonas históricas
- No podemos lookback en arrays históricos directamente en Pine
- Usamos una ventana de barras (bars_since_x) como proxy
- O aproximamos contando en el periodo visible

PASO 3: Contar cuántas de esas zonas tuvieron continuación
- OB alcista: ¿el precio subió después de tocar la zona? 
- OB bajista: ¿el precio bajó después de tocar la zona?

PASO 4: Tasa de continuación
tasa = zonas_con_continuacion / total_zonas_similares * 100

NOTA IMPORTANTE: Pine Script tiene limitaciones para análisis histórico
profundo (max_bars_back). La aproximación usa:
- Conteo de OBs activos vs total desde inicio
- Diferenciación por tipo y tamaño

ALTERNATIVA MÁS ROBUSTA:
- Usar un lookback de barras (200-500)
- En cada barra, verificar si hay un OB activo en esa zona
- Si el precio tocó el OB y continuó = éxito
- Acumular estadística
```

---

## 11. CÓMO CALCULAR CALIFICACIÓN

```
Score base = 0, máximo = 5

+2 puntos: tasa de continuación > 65%
+1 punto:  tasa de continuación > 50% (solo uno de los dos)
+1 punto:  MTF alineado con tendencia local
+1 punto:  zona fresca (no retestada)
+1 punto:  zona dentro de estructura (no es extremo suelto)
-2 puntos: MTF contradice
-1 punto:  neutralización activa (tasa 45-55%)
-1 punto:  zona ya usada (retestada una vez)

Resultado → clamp entre 0 y 5
Mostrar como: ★★★☆☆ (3 de 5)

Implementación:
score = 0
score += (taxaCont > 65) ? 2 : (taxaCont > 50) ? 1 : 0
score += mtfAligned ? 1 : 0
score += isFreshZone ? 1 : 0
score += zoneInStructure ? 1 : 0
score -= mtfContradicts ? 2 : 0
score -= isNeutral ? 1 : 0
score -= zoneUsed ? 1 : 0
score := math.max(0, math.min(5, score))
```

---

## 12. CÓMO IMPLEMENTAR SESIONES

```pine
// Input de sesión
sessionATime = input.session("0700-1600", "Sesión A")

// Detectar si estamos en sesión
inSessionA = not na(time(timeframe.period, sessionATime))

// Fondo de color durante sesión
bgcolor(showSessionA and inSessionA ? sessionAColor : na, 
        title="Sesión A fondo")

// Línea vertical al inicio de sesión
var bool lastSessionState = false
isSessionStart = inSessionA and not lastSessionState
if isSessionStart
    line.new(bar_index, low * 0.999, bar_index, high * 1.001, 
             color=color.gray, style=line.style_dashed)
lastSessionState := inSessionA
```

---

## 13. CÓMO IMPLEMENTAR MULTI-TIMEFRAME

```pine
// Solicitar datos del TF superior
[mtfTrend, mtfCont] = request.security(syminfo.tickerid, mtfTF, 
    [localTrend, localContRate], 
    lookahead=barmerge.lookahead_off)

// Evaluar alineación
mtfAligned = mtfTrend == localTrend
mtfContradicts = mtfTrend != localTrend and mtfTrend != "neutral"

// Penalización por contradicción
if mtfContradicts
    score -= 2
    
// Neutralización si MTF ≈ 50%
if math.abs(mtfCont - 50) < 5
    mtfNeutral = true
```

---

## 14. CÓMO EVITAR REPINTADO

```
REGLAS ANTI-REPINTADO:

1. NUNCA usar request.security() con lookahead_on
2. SIEMPRE usar ta.pivothigh/low con rightBars > 0
   → Los pivots se confirman con rightBars barras de retraso
   → Esto es inevitable pero transparente y correcto
3. NO dibujar señales en barras no cerradas
4. Para OBs: detectar SOLO en barras cerradas (not barstate.isrealtime)
5. Para BOS: usar close[0] (barra actual cerrada) vs lastPH
6. NO usar future() ni series en contextos de seguridad

TRANSPARENCIA DE RETRASO:
El indicador tendrá retraso de rightBars barras en la detección de pivots.
Con rightBars=10: una ruptura se detecta 10 barras después.
Esto es el tradeoff correcto: sin repintado pero con retraso.
```

---

## 15. LIMITACIONES DE PINE SCRIPT

| Limitación | Impacto | Solución parcial |
|-----------|---------|-----------------|
| max_bars_back | No puedes lookback más de 500 barras por defecto | Limitar lookback o usar max_bars_back=500 |
| Arrays estáticos | No puedes dimensionar arrays dinámicamente de forma ilimitada | Fijar tamaño máximo (ej: 50 OBs) |
| Sin BD histórica | No puedes acceder a datos de barras fuera del rango cargado | Usar ventana de lookback en barras actuales |
| MTF repintado | request.security() puede repintar en tiempo real | Usar lookahead_off siempre |
| Bucles lentos | Loops en cada barra pueden ser lentos | Limitar a max 50-100 iteraciones |
| max_boxes_count | Máximo 500 boxes por defecto | Limpiar boxes viejos con box.delete() |
| alertcondition | No admite strings dinámicos | Strings estáticos predefinidos |
| Sin acceso a red | No puedes consultar APIs externas | N/A — todo debe ser con datos de precio |

---

## 16. COSAS QUE NO SE PUEDEN CLONAR CON SOLO CAPTURAS

| Elemento | Por qué no se puede clonar |
|----------|---------------------------|
| Fórmula exacta de similitud de zonas | No se explica el algoritmo de comparación de zonas |
| Pesos exactos de la calificación | No se detallan en ninguna transcripción |
| Base de datos interna del Sensei | Si tiene una DB histórica propia, es imposible replicarla |
| Colores exactos del panel | No hay captura del panel en uso, solo el panel de inputs |
| Lógica interna de "racha" | No definida con precisión |
| Diferencia exacta entre Retest y Retest BOS | Solo hipótesis, no explicado |

---

## 17. DATOS ADICIONALES IDEALES

Para afinar el indicador, se necesitaría:

1. **Captura del panel en funcionamiento** (con números reales visible)
2. **Video donde explique fila por fila** qué significa cada dato del panel
3. **Captura en la que se vean las zonas grises** en el gráfico
4. **Comparación de mismo activo + TF** con mi indicador y el del Sensei simultáneamente
5. **Explicación de qué activa "Neutralización"** (¿es automático o manual?)
6. **Explicación de si "racha" son pivots o barras**

---

## ARQUITECTURA FINAL DEL INDICADOR

```
sensei_ob_scanner_pro.pine
├── INPUTS (7 grupos)
│   ├── 🔵 Estructura (leftBars, rightBars, showBOS, showCHoCH)
│   ├── 📦 Order Blocks (showOB, maxOBs, showMTF, mtfTF, ...)
│   ├── 🟩 FVG (showFVG, showFVGLabel, ...)
│   ├── 📊 Probabilidad (lookback90, lookback30, pipVar)
│   ├── 🕐 Sesiones (showSessionA, sessionATime, ...)
│   ├── 🌐 MTF (useMTFFilter, penalizeMTF)
│   └── 📋 Panel (showPanel, panelPos, panelSize)
│
├── MÓDULO ESTRUCTURA
│   ├── Pivot detection (ph/pl con rightBars confirmación)
│   ├── HH/HL/LH/LL tracking
│   ├── Trend determination
│   └── Estado calculation
│
├── MÓDULO BOS/CHoCH
│   ├── BOS up/down detection
│   ├── CHoCH up/down detection
│   ├── Line drawing
│   └── Label drawing
│
├── MÓDULO ORDER BLOCKS
│   ├── Local OB detection (on BOS/CHoCH)
│   ├── OB state management (fresh/used/invalidated)
│   ├── MTF OB via request.security()
│   └── Box drawing + labels
│
├── MÓDULO FVG
│   ├── Bullish FVG detection
│   ├── Bearish FVG detection
│   └── Box drawing + labels
│
├── MÓDULO ESTADÍSTICO (núcleo del Sensei)
│   ├── Continuation rate calculation
│   ├── Retest up/down calculation
│   ├── Retest BOS up/down calculation
│   └── Rating calculation
│
├── MÓDULO SESIONES
│   ├── Session detection
│   ├── Background color
│   └── Vertical lines
│
├── MÓDULO MTF
│   ├── MTF data request
│   ├── MTF trend calculation
│   └── Alignment evaluation
│
├── MÓDULO PANEL (tabla)
│   ├── Header row
│   ├── ESTRUCTURA section
│   ├── PROBABILIDADES section
│   └── MTF section
│
└── MÓDULO ALERTAS
    ├── Alert: BOS alcista
    ├── Alert: BOS bajista
    ├── Alert: Precio toca OB alcista
    ├── Alert: Precio toca OB bajista
    ├── Alert: Neutralización activa
    └── Alert: Calificación alta (≥4)
```

---

## CRONOGRAMA DE IMPLEMENTACIÓN

1. ✅ AUDITORIA_DIFERENCIAS.md
2. ✅ PLAN_RECONSTRUCCION.md
3. ⏳ sensei_ob_scanner_pro.pine (indicador)
4. ⏳ sensei_ob_strategy_pro.pine (estrategia)
5. ⏳ README.md (documentación)
