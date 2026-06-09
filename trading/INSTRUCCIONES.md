# XAU/USD — Sistema de Análisis Estadístico de Zonas
## Instrucciones de Configuración Completa

---

## ✅ Tablas Supabase (ya creadas)

Proyecto: **Maicol** (`pyiukqeuaxonsrrgbfzq`)
URL: `https://pyiukqeuaxonsrrgbfzq.supabase.co`
Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` *(ver Supabase dashboard → Settings → API)*

Tablas creadas:
- `zonas_historial` — historial diario de resultados de zonas
- `niveles_historial` — historial de niveles HH/HL/LH/LL
- `analisis_actual` — fila única (id=1) con el análisis del momento

---

## 🔧 Configuración n8n

### Variables de entorno en n8n
En n8n → Settings → Environment Variables (o en el `.env` de tu instancia):

```
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aXVrcWV1YXhvbnNycmdiZnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNTQ2MjIsImV4cCI6MjA5NTkzMDYyMn0.bdGYK59jrIj_8E5ySDmzc7WdRL7e6GQaugq4-dvRoM4
TWELVE_DATA_APIKEY=TU_APIKEY_DE_TWELVEDATA
```

### Importar los workflows
1. En n8n → menú superior → **Import from file**
2. Importar en este orden:
   - `workflow1_webhook.json`
   - `workflow2_recalculo_30min.json`
   - `workflow3_cierre_21h.json`
3. Activar los 3 workflows (toggle ON)

### Tras importar Workflow 1
- Ve al nodo **"Webhook Pine Script"**
- Copia la URL del webhook que aparece (formato: `https://TU_N8N/webhook/xauusd-zona`)
- Guarda esa URL, la necesitarás en Pine Script

---

## 📈 Configuración Pine Script en TradingView

### Pasos
1. Abrir TradingView → gráfico XAU/USD → Pine Editor
2. Pegar el contenido de `xauusd_zonas.pine`
3. Hacer clic en **"Add to chart"**

### Configurar inputs del indicador
En la rueda ⚙ del indicador → Settings:
- **URL Webhook n8n**: pegar la URL del Workflow 1
- **Supabase URL**: `https://pyiukqeuaxonsrrgbfzq.supabase.co`
- **Supabase anon key**: pegar tu anon key

### Configurar la Alerta de TradingView
1. TradingView → **Alerts** → **Create Alert**
2. Condición: seleccionar el indicador → **"Webhook n8n XAU/USD"**
3. En **Notifications** → activar **Webhook URL**
4. URL: pegar la URL del Workflow 1 de n8n
5. Mensaje: dejar vacío (el indicador genera el JSON automáticamente)
6. Frecuencia: **Once per bar close**
7. Expiración: máxima disponible
8. Hacer clic en **Create**

---

## 🔄 Flujo de datos completo

```
14:00 (hora España, L-V)
  Pine Script detecta zona OB/FVG/ACUM + pivots HH/HL/LH/LL
    → Dispara alert con JSON al webhook n8n
      → Workflow 1:
          - Parsea zona y niveles
          - Consulta zonas_historial en Supabase
          - Calcula prob_respeto_fuerte / débil / rompió
          - Calcula prob_ruptura/soporte de niveles
          - Escribe en analisis_actual (upsert id=1)
          - Responde OK a TradingView
            → Pine Script muestra panel con probabilidades

Cada 30 minutos (14:30, 15:00 ... 20:30)
  → Workflow 2 (scheduler):
      - Lee precio actual de Twelve Data
      - Recalcula FASE (LEJOS/ACERCANDO/EN_ZONA)
      - Actualiza analisis_actual.fase
        → Pine Script refleja cambio en próxima vela

21:00 cada día laborable
  → Workflow 3 (scheduler):
      - Lee velas 1H del día de Twelve Data
      - Evalúa si la zona fue respetada/rota
      - Inserta registro en zonas_historial
      - Resetea fase a LEJOS en analisis_actual
        → El historial crece, las probabilidades mejoran
```

---

## 📊 Qué se ve en TradingView

| Elemento | Descripción |
|----------|-------------|
| **Caja naranja** | Order Block activo |
| **Caja azul** | Zona de acumulación |
| **Caja verde** | Fair Value Gap (FVG) |
| **Caja gris** | Nivel estructural |
| **Líneas rojas punteadas** | Niveles HH/LH por encima |
| **Líneas verdes punteadas** | Niveles HL/LL por debajo |
| **Panel esquina sup. derecha** | Tipo zona, precio, probabilidades, score, fase |

### Actualizar panel con datos de n8n
Cuando n8n escriba en Supabase, actualiza manualmente los inputs del indicador
en TradingView (Settings → Probabilidades n8n) con los valores de `analisis_actual`.

**Alternativa automatizada**: crear un webhook en n8n que llame a la API de
TradingView para actualizar los inputs del indicador automáticamente.

---

## 🔑 Credenciales que necesitas conseguir

| Credencial | Dónde obtenerla |
|-----------|-----------------|
| **Twelve Data API Key** | https://twelvedata.com → Sign up → API Keys |
| **n8n Webhook URL** | n8n → Workflow 1 → nodo Webhook → copiar URL |
| **Supabase anon key** | Ya en el dashboard: Settings → API → anon public |

---

## ⚠️ Limitaciones de Pine Script Essential

Pine Script en el plan Essential **no puede hacer peticiones HTTP salientes**
directas desde el código. El sistema usa **alertas con payload JSON** como
canal de salida hacia n8n.

Para lectura de vuelta desde Supabase hacia Pine Script, las opciones son:
1. **Actualizar inputs manualmente** tras cada ejecución de n8n (simple)
2. **Usar Pine Script Premium** con `request.security()` a una fuente custom
3. **Crear un Supabase Edge Function** que sirva datos en formato compatible
   con TradingView como fuente de datos custom (opción avanzada)

---

## 🔍 Verificar que funciona

1. En Supabase Dashboard → Table Editor → `analisis_actual` → ver fila id=1
2. Dispara la alerta manualmente desde TradingView
3. En n8n → Executions → ver la ejecución del Workflow 1
4. Volver a Supabase → `analisis_actual` → ver `updated_at` actualizado
5. A las 21:00 → `zonas_historial` tendrá un nuevo registro
