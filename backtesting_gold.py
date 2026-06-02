# ============================================================
# SENSEI ZONES BACKTESTING - ORO (XAU/USD)
# Datos reales diarios XAUUSD (2019-2025) → intraday sintético
# fiel a precios OHLC reales de cada día
# ============================================================

import pandas as pd
import numpy as np
import io, urllib.request, warnings
warnings.filterwarnings('ignore')

# ── CONFIGURACIÓN ────────────────────────────────────────────
SESSION_START  = 13
SESSION_END    = 19
PIVOT_LEN      = 5
LEVEL_LOOKBACK = 80
MIN_GAP_ATR    = 0.10
MAX_DIST_ATR   = 5.00
ZONE_LOOKBACK  = 50
ZONE_BARS      = 5
MAX_ZONE_ATR   = 1.20
MIN_MOVE_ATR   = 1.00
RESULT_CANDLES = 20

# ── 1. DESCARGAR DATOS DIARIOS REALES ───────────────────────
print("📥 Descargando datos reales XAUUSD (daily, 2019-2025)...")
URL = ("https://raw.githubusercontent.com/CUPID-l/HMM_part"
       "/main/data/raw/XAUUSD/XAUUSD_20251004T180527Z.csv")
req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
raw = urllib.request.urlopen(req, timeout=20).read().decode(errors="ignore")
daily = pd.read_csv(io.StringIO(raw), parse_dates=["Date"])
daily = daily.rename(columns=str.lower).set_index("date")
daily = daily[["open", "high", "low", "close"]].dropna()

# Últimos 200 días de datos
cutoff = daily.index.max() - pd.DateOffset(days=200)
daily  = daily[daily.index >= cutoff]
print(f"   → {len(daily)} días reales | {daily.index[0].date()} → {daily.index[-1].date()}")
print(f"   → Precio: {daily['close'].min():.0f} – {daily['close'].max():.0f} USD")

# ── 2. GENERAR CANDLES INTRADIARIOS REALISTAS ────────────────
# Técnica: Brownian bridge + extremos forzados dentro de cada día real

def _make_intraday(row, n_bars, tz="Europe/Madrid", rng=None):
    """
    Genera n_bars candles OHLCV dentro de un día real.
    Garantiza: primer open = daily open, último close = daily close,
    max(highs) = daily high, min(lows) = daily low.
    """
    if rng is None:
        rng = np.random.default_rng()

    o, h, l, c = row["open"], row["high"], row["low"], row["close"]
    date        = row.name

    # Brownian bridge de n_bars+1 puntos
    t      = np.linspace(0, 1, n_bars + 1)
    bridge = o + (c - o) * t + np.sqrt(t * (1 - t)) * (h - l) * 0.5 * rng.standard_normal(n_bars + 1)

    # Forzar min y max dentro del rango real
    span = bridge.max() - bridge.min()
    if span > 0:
        bridge = l + (bridge - bridge.min()) / span * (h - l)
    else:
        bridge = np.full(n_bars + 1, o)

    # Fijar extremos exactos
    bridge[0]  = o
    bridge[-1] = c
    # insertar high y low en posiciones aleatorias distintas
    hi_pos = rng.integers(0, n_bars)
    lo_pos = rng.integers(0, n_bars)
    while lo_pos == hi_pos:
        lo_pos = rng.integers(0, n_bars)
    bridge[hi_pos]     = h
    bridge[hi_pos + 1] = h
    bridge[lo_pos]     = l
    bridge[lo_pos + 1] = l
    bridge[0]          = o
    bridge[-1]         = c

    # Construir OHLCV
    opens   = bridge[:-1]
    closes  = bridge[1:]
    highs   = np.maximum(opens, closes) + np.abs(rng.normal(0, (h - l) * 0.03, n_bars))
    lows    = np.minimum(opens, closes) - np.abs(rng.normal(0, (h - l) * 0.03, n_bars))
    highs   = np.clip(highs, l, h)
    lows    = np.clip(lows,  l, h)
    volumes = np.abs(rng.normal(5000, 1500, n_bars)).astype(int)

    # Timestamps con hora España (sesión completa 00-23)
    times = pd.date_range(
        start=pd.Timestamp(date).tz_localize("Europe/Madrid"),
        periods=n_bars,
        freq=f"{24 * 60 // n_bars}min"
    )
    return pd.DataFrame({
        "open":   opens,  "high":  highs,
        "low":    lows,   "close": closes,
        "volume": volumes
    }, index=times)


def build_tf(daily_df, bars_per_day):
    rng    = np.random.default_rng(42)
    frames = [_make_intraday(row, bars_per_day, rng=rng)
              for _, row in daily_df.iterrows()]
    df = pd.concat(frames).sort_index()
    df.index.name = None
    return df


print("\n⚙️  Construyendo timeframes intradiarios...")
df_1h  = build_tf(daily, 24)
df_15m = build_tf(daily, 96)
df_5m  = build_tf(daily, 288)
print(f"   1H  → {len(df_1h):,} velas | precio medio: {df_1h['close'].mean():.0f}")
print(f"   15M → {len(df_15m):,} velas")
print(f"   5M  → {len(df_5m):,} velas")

# ── 3. FUNCIONES DE DETECCIÓN (lógica Pine Script) ───────────

def calc_atr(df, period=14):
    prev  = df["close"].shift(1)
    tr    = pd.concat([df["high"] - df["low"],
                       (df["high"] - prev).abs(),
                       (df["low"]  - prev).abs()], axis=1).max(axis=1)
    return tr.rolling(period).mean()


def find_pivot_highs(df, pivot_len=5):
    highs = []
    for i in range(pivot_len, len(df) - pivot_len):
        w = df["high"].iloc[i - pivot_len: i + pivot_len + 1]
        if df["high"].iloc[i] == w.max():
            highs.append((df.index[i], df["high"].iloc[i]))
    return highs


def find_pivot_lows(df, pivot_len=5):
    lows = []
    for i in range(pivot_len, len(df) - pivot_len):
        w = df["low"].iloc[i - pivot_len: i + pivot_len + 1]
        if df["low"].iloc[i] == w.min():
            lows.append((df.index[i], df["low"].iloc[i]))
    return lows


def detect_zones(df, pivot_len=5, zone_bars=5, zone_lookback=50,
                 max_zone_atr=1.20, min_move_atr=1.00):
    atr   = calc_atr(df)
    zones = []
    for idx in range(zone_lookback + zone_bars, len(df)):
        cc   = df["close"].iloc[idx]
        catr = atr.iloc[idx]
        ct   = df.index[idx]
        hour = ct.hour if hasattr(ct, "hour") else ct.to_pydatetime().hour
        if hour < SESSION_START or hour >= SESSION_END:
            continue

        # ── Supply ──
        for i in range(zone_bars, zone_lookback):
            if idx - i < 0:
                break
            sl    = df.iloc[idx - i: idx - i + zone_bars]
            b_h   = sl["high"].max()
            b_l   = sl["low"].min()
            ht    = b_h - b_l
            mv_dn = b_l - df["low"].iloc[idx]
            if (ht <= catr * max_zone_atr and mv_dn >= catr * min_move_atr
                    and cc < b_l):
                zones.append({"time": ct, "type": "supply",
                               "top": b_h, "bottom": b_l, "height": ht,
                               "atr": catr, "close_at_detection": cc,
                               "bar_idx": idx})
                break

        # ── Demand ──
        for i in range(zone_bars, zone_lookback):
            if idx - i < 0:
                break
            sl    = df.iloc[idx - i: idx - i + zone_bars]
            b_h   = sl["high"].max()
            b_l   = sl["low"].min()
            ht    = b_h - b_l
            mv_up = df["high"].iloc[idx] - b_h
            if (ht <= catr * max_zone_atr and mv_up >= catr * min_move_atr
                    and cc > b_h):
                zones.append({"time": ct, "type": "demand",
                               "top": b_h, "bottom": b_l, "height": ht,
                               "atr": catr, "close_at_detection": cc,
                               "bar_idx": idx})
                break
    return zones


def detect_levels(df, pivot_len=5, level_lookback=80,
                  min_gap_atr=0.10, max_dist_atr=5.00):
    atr    = calc_atr(df)
    ph     = find_pivot_highs(df, pivot_len)
    pl     = find_pivot_lows(df, pivot_len)
    levels = []
    for idx in range(level_lookback, len(df)):
        cc    = df["close"].iloc[idx]
        catr  = atr.iloc[idx]
        ct    = df.index[idx]
        hour  = ct.hour if hasattr(ct, "hour") else ct.to_pydatetime().hour
        if hour < SESSION_START or hour >= SESSION_END:
            continue
        best_h, best_h_d = None, 1e9
        for ts, val in ph:
            age  = abs((ct - ts).total_seconds()) / 3600
            dist = val - cc
            if (age <= level_lookback and val > cc + catr * min_gap_atr
                    and dist <= catr * max_dist_atr and dist < best_h_d):
                best_h, best_h_d = val, dist
        best_l, best_l_d = None, 1e9
        for ts, val in pl:
            age  = abs((ct - ts).total_seconds()) / 3600
            dist = cc - val
            if (age <= level_lookback and val < cc - catr * min_gap_atr
                    and dist <= catr * max_dist_atr and dist < best_l_d):
                best_l, best_l_d = val, dist
        if best_h or best_l:
            levels.append({"time": ct, "close": cc,
                            "nearest_high": best_h, "nearest_low": best_l,
                            "dist_to_high": best_h_d if best_h else None,
                            "dist_to_low":  best_l_d if best_l else None,
                            "bar_idx": idx})
    return levels

# ── 4. ANÁLISIS DE RESULTADO ─────────────────────────────────

def analyze_zone_result(df, zone, result_candles=20):
    idx    = zone["bar_idx"]
    ztype  = zone["type"]
    top    = zone["top"]
    bot    = zone["bottom"]
    atr    = zone["atr"]
    cc     = zone["close_at_detection"]
    future = df.iloc[idx + 1: idx + 1 + result_candles]
    if len(future) == 0:
        return None
    max_up   = future["high"].max()  - cc
    max_down = cc - future["low"].min()
    if ztype == "supply":
        respected = future["close"].max() < top + atr * 0.10
        direction = "respected" if respected else "broke"
        move_pips = max_down if respected else -max_up
    else:
        respected = future["close"].min() > bot - atr * 0.10
        direction = "respected" if respected else "broke"
        move_pips = max_up if respected else -max_down
    return {"result": direction,
            "move_favor":   round(max_down if ztype == "supply" else max_up, 2),
            "move_against": round(max_up   if ztype == "supply" else max_down, 2),
            "move_pips":    round(move_pips, 2),
            "candles_analyzed": len(future)}

# ── 5. CONTEXTO MULTI-TIMEFRAME ──────────────────────────────

def get_context_at_time(df_other, target_time, window_minutes=30):
    start    = target_time - pd.Timedelta(minutes=window_minutes)
    end      = target_time + pd.Timedelta(minutes=window_minutes)
    sl       = df_other[(df_other.index >= start) & (df_other.index <= end)]
    if len(sl) < 3:
        return {"context": "no_data", "trend": None, "strength": None}
    closes   = sl["close"]
    trend    = "bullish" if closes.iloc[-1] > closes.iloc[0] else "bearish"
    strength = round(abs(closes.iloc[-1] - closes.iloc[0]) / sl["close"].mean() * 100, 3)
    return {"context": trend, "trend": trend, "strength": strength}

# ── 6. DETECCIÓN COMPLETA ────────────────────────────────────
print("\n🔍 Detectando zonas y niveles...")
zones_15m = detect_zones(df_15m)
zones_5m  = detect_zones(df_5m)
levels_1h = detect_levels(df_1h)
print(f"   Zonas 15M: {len(zones_15m)}")
print(f"   Zonas 5M : {len(zones_5m)}")
print(f"   Niveles 1H: {len(levels_1h)}")

# ── 7. CONSTRUIR DATASET ─────────────────────────────────────
print("\n⚙️  Construyendo dataset...")
records = []
for zone in zones_15m:
    t      = zone["time"]
    result = analyze_zone_result(df_15m, zone, RESULT_CANDLES)
    if not result:
        continue
    ctx_5m  = get_context_at_time(df_5m,  t, 15)
    ctx_1h  = get_context_at_time(df_1h,  t, 60)

    zone_5m_nearby = any(
        abs((z["time"] - t).total_seconds()) / 60 <= 30
        and abs(z["top"] - zone["top"]) <= zone["atr"] * 0.5
        and z["type"] == zone["type"]
        for z in zones_5m
    )
    level_1h_nearby = False
    for lv in levels_1h:
        if abs((lv["time"] - t).total_seconds()) / 3600 <= 2:
            if zone["type"] == "supply" and lv["nearest_high"]:
                if abs(lv["nearest_high"] - zone["top"]) <= zone["atr"]:
                    level_1h_nearby = True
            elif zone["type"] == "demand" and lv["nearest_low"]:
                if abs(lv["nearest_low"] - zone["bottom"]) <= zone["atr"]:
                    level_1h_nearby = True

    score = (int(zone_5m_nearby) + int(level_1h_nearby)
             + int(ctx_1h["trend"] == ("bearish" if zone["type"] == "supply" else "bullish")))

    records.append({
        "detected_at":          t.isoformat(),
        "timeframe":            "15m",
        "zone_type":            zone["type"],
        "zone_top":             round(zone["top"], 2),
        "zone_bottom":          round(zone["bottom"], 2),
        "zone_height":          round(zone["height"], 2),
        "atr_at_detection":     round(zone["atr"], 2),
        "close_at_detection":   round(zone["close_at_detection"], 2),
        "trend_1h":             ctx_1h["trend"],
        "strength_1h":          ctx_1h["strength"],
        "trend_5m":             ctx_5m["trend"],
        "strength_5m":          ctx_5m["strength"],
        "zone_5m_nearby":       zone_5m_nearby,
        "level_1h_nearby":      level_1h_nearby,
        "confluence_score":     score,
        "result":               result["result"],
        "move_favor":           result["move_favor"],
        "move_against":         result["move_against"],
        "move_pips":            result["move_pips"],
    })

df_results = pd.DataFrame(records)
print(f"   → {len(df_results)} zonas analizadas")

# ── 8. ESTADÍSTICAS ──────────────────────────────────────────
print("\n" + "=" * 45)
print("📊  ESTADÍSTICAS SENSEI ZONES — ORO 15M")
print("=" * 45)

total  = len(df_results)
supply = df_results[df_results["zone_type"] == "supply"]
demand = df_results[df_results["zone_type"] == "demand"]
print(f"Total zonas analizadas : {total}")
print(f"  Supply (venta)       : {len(supply)}")
print(f"  Demand (compra)      : {len(demand)}")

for label, subset in [("SUPPLY", supply), ("DEMAND", demand)]:
    if len(subset) == 0:
        continue
    resp    = subset[subset["result"] == "respected"]
    broke   = subset[subset["result"] == "broke"]
    pct     = len(resp) / len(subset) * 100
    avg_fav = resp["move_favor"].mean()   if len(resp)   > 0 else 0
    avg_ag  = broke["move_against"].mean() if len(broke) > 0 else 0
    rr      = avg_fav / avg_ag if avg_ag > 0 else 0
    print(f"\n  {label}:")
    print(f"    Respetadas   : {len(resp)}/{len(subset)}  ({pct:.1f}%)")
    print(f"    Mov. favor   : {avg_fav:.1f} USD  avg")
    print(f"    Mov. contra  : {avg_ag:.1f} USD  avg")
    print(f"    R:R implícito: {rr:.2f}")

print("\n📊  POR CONFLUENCIA (score 0-3)")
print("-" * 40)
for sc in [0, 1, 2, 3]:
    sub  = df_results[df_results["confluence_score"] == sc]
    if len(sub) == 0:
        continue
    resp = sub[sub["result"] == "respected"]
    pct  = len(resp) / len(sub) * 100
    bar  = "█" * int(pct / 5)
    print(f"  Score {sc}: {len(sub):3d} zonas  {pct:5.1f}%  {bar}")

print("\n📊  POR TENDENCIA 1H EN EL MOMENTO DE LA ZONA")
print("-" * 40)
for ztype in ["supply", "demand"]:
    ideal_trend = "bearish" if ztype == "supply" else "bullish"
    sub_aligned = df_results[
        (df_results["zone_type"] == ztype) &
        (df_results["trend_1h"]  == ideal_trend)
    ]
    sub_contra  = df_results[
        (df_results["zone_type"] == ztype) &
        (df_results["trend_1h"]  != ideal_trend) &
        (df_results["trend_1h"].notna())
    ]
    for label, sub in [(f"{ztype.upper()} alineado", sub_aligned),
                       (f"{ztype.upper()} contra-tendencia", sub_contra)]:
        if len(sub) == 0:
            continue
        resp = sub[sub["result"] == "respected"]
        pct  = len(resp) / len(sub) * 100
        print(f"  {label:30s}: {len(sub):3d} zonas  {pct:5.1f}% respetadas")

print("\n✅ ANÁLISIS COMPLETO")
print(f"   Datos reales: {daily.index[0].date()} → {daily.index[-1].date()}")
print(f"   Precio: {daily['close'].min():.0f}–{daily['close'].max():.0f} USD")

# ── 9. GUARDAR RESULTADOS ─────────────────────────────────────
out = "/home/user/maicol/gold_zones_results.csv"
df_results.to_csv(out, index=False)
print(f"\n💾 Resultados guardados en: {out}")
