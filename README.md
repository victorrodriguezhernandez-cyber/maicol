# EL SENSEI PRO — Indicador Pine Script v5

Reconstrucción del sistema de probabilidades del Sensei para TradingView.

---

## CÓMO INSTALAR

1. Abre TradingView → Pine Script Editor
2. Copia el contenido de `sensei_ob_scanner_pro.pine`
3. Pega en el editor y haz click en **"Add to chart"**
4. Para la estrategia: usa `sensei_ob_strategy_pro.pine` en su lugar

---

## CÓMO LEER EL PANEL

El panel aparece en la esquina superior derecha (configurable). Tiene tres secciones:

### SECCIÓN ESTRUCTURA

| Campo | Qué significa |
|-------|--------------|
| **Tendencia** | ALCISTA (verde) / BAJISTA (rojo) / NEUTRAL (gris). Basado en HH/HL o LH/LL |
| **Máx. válidos** | Número de swing highs dentro de la estructura activa |
| **Mín. válidos** | Número de swing lows dentro de la estructura activa |
| **HH actual** | Precio del último Higher High confirmado |
| **HL actual** | Precio del último Higher Low confirmado |
| **LH actual** | Precio del último Lower High confirmado |
| **LL actual** | Precio del último Lower Low confirmado |
| **Estado** | Estado actual de la estructura (ver tabla de estados) |

### TABLA DE ESTADOS

| Estado | Qué significa | Acción sugerida |
|--------|--------------|-----------------|
| Confirmado alcista | HH + HL confirmados, tendencia clara | Buscar compras en zonas de demanda |
| Confirmado bajista | LH + LL confirmados, tendencia clara | Buscar ventas en zonas de oferta |
| Validando máximo | Posible nuevo HH en formación | Esperar confirmación |
| Validando mínimo | Posible nuevo HL en formación | Esperar confirmación |
| **NEUTRALIZACIÓN** | Tasa ≈50% o TF contradice | **NO OPERAR** |

### SECCIÓN PROBABILIDADES

| Campo | Qué significa | Rango |
|-------|--------------|-------|
| **Tasa continuación** | % de zonas similares históricas que continuaron. El corazón del indicador | 0-100% |
| **Racha tendencia** | Pivots consecutivos confirmando la tendencia actual | Número |
| **Retest BOS ↑** | % de zonas con BOS alcista que fueron retestadas desde arriba | 0-100% |
| **Retest ↑** | % de zonas alcistas que recibieron retest general | 0-100% |
| **Retest BOS ↓** | % de zonas con BOS bajista retestadas desde abajo | 0-100% |
| **Retest ↓** | % de zonas bajistas que recibieron retest general | 0-100% |
| **Calificación** | ★ de 1 a 5 basado en calidad de zona activa | ★☆☆☆☆ a ★★★★★ |

### SECCIÓN MTF (Multi-Timeframe)

| Campo | Qué significa |
|-------|--------------|
| **MTF Tendencia** | Tendencia en el timeframe superior (default 1h) |
| **MTF Tasa cont.** | Tasa de continuación en el TF superior |
| **Alineación** | ALINEADO (verde) / CONTRADICE (rojo) / NEUTRAL (gris) |

---

## QUÉ SIGNIFICA CADA PORCENTAJE

### Tasa de continuación
- **>65%**: Alta probabilidad. Las condiciones son buenas para operar.
- **55-65%**: Media-alta. Confirmar en TF pequeño antes de entrar.
- **50-55%**: Media. Necesita confirmación adicional.
- **≈50% (45-55%)**: **NEUTRALIZACIÓN** — El mercado no tiene dirección clara. NO OPERAR.
- **<45%**: Zona en contra de la tendencia dominante. No operar en esa dirección.

### Regla del 50%
> "Cuando ves 50%, significa neutralización. Todavía no compres porque no está listo."
> — El Sensei

El indicador **bloquea automáticamente** la señal cuando la tasa está entre 45-55%.

---

## QUÉ INPUTS TOCAR

### Para empezar (configuración básica)

| Input | Valor recomendado | Cuándo cambiarlo |
|-------|------------------|-----------------|
| Barras izquierda pivot | 10 | Aumentar en TF diario/semanal. Bajar en 1m-5m |
| Barras derecha pivot | 10 | Igual que izquierda |
| Marco temporal MTF | 60 (1 hora) | Cambiar según tu TF de trading |
| Sesión A | 0700-1600 | Adaptar a tu zona horaria de trading |
| Max OBs visibles | 5 | Bajar si el gráfico se ve saturado |

### Para afinar probabilidades

| Input | Efecto |
|-------|--------|
| Lookback zonas similares | Más alto = estadística más robusta pero más lenta |
| Lookback BOS | Cuántos BOS históricos analiza para el cálculo |
| Variación pips similitud | Mayor = más zonas "similares", menor = más estricto |

---

## CÓMO USAR LA ESTRATEGIA (Backtesting)

1. Abre `sensei_ob_strategy_pro.pine` en el editor
2. Añade al gráfico como **Strategy** (no indicador)
3. Configura en el panel de **Inputs**:
   - Tasa mínima (default 55%): mínimo para entrar
   - Tipo de entrada: "Touch" o "Close"
   - SL: "Zone" (extremo del OB) o "ATR"
   - TP: "RR" (ratio fijo), "Swing" (último swing), "Zone" (OB contrario)
4. Ve a la pestaña **Strategy Tester** para ver resultados

### Configuración conservadora (recomendada para empezar)
- Tasa mínima: 60%
- Entrada: "Close"
- SL: "Zone"
- TP: "RR" con ratio 2.0
- MTF filter: activado
- Max operaciones/día: 2

### Configuración agresiva
- Tasa mínima: 52%
- Entrada: "Touch"
- SL: "ATR" con multiplicador 1.5
- TP: "Swing"
- MTF filter: desactivado

---

## QUÉ PARTES PUEDEN REPINTAR

### Repintado CERO (confirmados)
- BOS y CHoCH: solo se dibujan cuando el cierre confirma la ruptura
- Order Blocks: se detectan al confirmar BOS (con retraso de rightBars)
- HH/HL/LH/LL: confirmados con retraso de rightBars barras

### Retraso esperado
Con `rightBars = 10`: los pivots se confirman **10 barras después** de formarse.
Esto NO es repintado — es retraso por confirmación. Es correcto y necesario.

### Advertencia MTF
El cálculo MTF usa `lookahead_off` (correcto). Sin embargo, en tiempo real puede haber una barra de diferencia en el cierre del TF superior.

---

## LIMITACIONES CONOCIDAS

| Limitación | Descripción |
|-----------|-------------|
| Retraso en pivots | rightBars barras de retraso. No evitable sin repintado |
| Aproximación estadística | La fórmula exacta del Sensei no está publicada. Usamos la mejor aproximación posible según sus transcripciones |
| max_bars_back | Pine Script limita el lookback histórico. Máximo ~500 barras atrás |
| No hay calendario económico | Pine Script no accede a eventos económicos externos |
| Similitud de zonas | "Similar" se define por tipo y tamaño en pips, no por estructura completa |

---

## MATERIAL ADICIONAL PARA AFINAR

Para mejorar la precisión del indicador, sería útil tener:

1. **Captura del panel en uso** (con todos los números visibles en tiempo real)
2. **Video donde el Sensei explique fila por fila** el panel de probabilidades
3. **Captura que muestre las zonas grises** en el gráfico
4. **El mismo activo y TF** con el indicador del Sensei y el mío simultáneamente
5. **Explicación de exactamente qué activa "Neutralización"**
6. **Si "racha" son pivots, BOS, o barras**

---

## ARCHIVOS DEL PROYECTO

| Archivo | Descripción |
|---------|-------------|
| `sensei_ob_scanner_pro.pine` | Indicador principal |
| `sensei_ob_strategy_pro.pine` | Estrategia para backtesting |
| `AUDITORIA_DIFERENCIAS.md` | Análisis completo de diferencias |
| `PLAN_RECONSTRUCCION.md` | Arquitectura y plan técnico |
| `README.md` | Este archivo |

---

## DIFERENCIAS RESTANTES CON EL ORIGINAL

| Diferencia | Causa |
|-----------|-------|
| Porcentajes pueden no coincidir exactamente | Fórmula exacta del Sensei no publicada |
| Panel puede tener ligeras diferencias de diseño | Sin captura detallada del panel en uso |
| Racha de tendencia puede calcularse diferente | No se explica si son barras o pivots |
| Retest BOS vs Retest pueden diferir | Solo hipótesis de la diferencia entre ambos |
