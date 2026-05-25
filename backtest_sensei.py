#!/usr/bin/env python3
"""
Sensei Pro OB — Backtest Python
Misma lógica que sensei_ob_strategy.pine
"""

import pandas as pd
import numpy as np
import yfinance as yf
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import warnings
warnings.filterwarnings('ignore')

# ═══════════════════════════════════════════════════════════
# PARÁMETROS (mismos que la estrategia Pine)
# ═══════════════════════════════════════════════════════════
SYMBOL       = "BTC-USD (sintético)"
INTERVAL     = "4h"
PERIOD       = "2y"

SWING_LEN    = 10
ATR_LEN      = 14
CONSOL_BARS  = 5
CONSOL_MULT  = 0.4

TASA_MIN     = 60       # % mínimo para entrar
TP_RR        = 2.0      # risk:reward
SL_BUFFER    = 0.2      # multiplicador ATR sobre el borde del OB
TOUCH_ATR    = 0.5      # tolerancia para tocar el OB (en ATR)
VOL_FILTER   = True
MIN_VOL_RATIO= 0.8

INITIAL_CAP  = 10_000   # USD
RISK_PCT     = 0.02     # 2% riesgo por operación
COMMISSION   = 0.001    # 0.1% por lado

# ═══════════════════════════════════════════════════════════
# DATOS
# ═══════════════════════════════════════════════════════════
print(f"Descargando {SYMBOL} {INTERVAL} ({PERIOD})...")
raw = yf.download(SYMBOL, period=PERIOD, interval=INTERVAL,
                  auto_adjust=True, progress=False)
raw.columns = [c[0] if isinstance(c, tuple) else c for c in raw.columns]
raw = raw.dropna().reset_index()
raw.columns = [c.lower() if isinstance(c, str) else c for c in raw.columns]
if 'datetime' in raw.columns:
    raw = raw.rename(columns={'datetime': 'date'})
print(f"  {len(raw)} velas cargadas  ({raw['date'].iloc[0]} → {raw['date'].iloc[-1]})")

o = raw['open'].values
h = raw['high'].values
l = raw['low'].values
c = raw['close'].values
v = raw['volume'].values
n = len(raw)

# ═══════════════════════════════════════════════════════════
# ATR (EWM como Pine Script)
# ═══════════════════════════════════════════════════════════
def calc_atr(h, l, c, period):
    tr = np.maximum(h - l,
         np.maximum(np.abs(h - np.roll(c, 1)),
                    np.abs(l - np.roll(c, 1))))
    tr[0] = h[0] - l[0]
    atr = np.zeros(n)
    atr[:period] = np.nan
    atr[period-1] = tr[:period].mean()
    alpha = 1.0 / period
    for i in range(period, n):
        atr[i] = atr[i-1] * (1 - alpha) + tr[i] * alpha
    return atr

atr  = calc_atr(h, l, c, ATR_LEN)
vol_ma  = pd.Series(v).rolling(20).mean().values
vol_rel = np.where(vol_ma > 0, v / vol_ma, 1.0)

# ═══════════════════════════════════════════════════════════
# PIVOTS CONFIRMADOS (como ta.pivothigh con left=right=SWING_LEN)
# Un pivot en barra i se confirma SWING_LEN barras después
# ═══════════════════════════════════════════════════════════
ph = np.full(n, np.nan)   # pivot high confirmado en barra i+SWING_LEN
pl = np.full(n, np.nan)

for i in range(SWING_LEN, n - SWING_LEN):
    window_h = h[i - SWING_LEN: i + SWING_LEN + 1]
    if h[i] == window_h.max():
        ph[i + SWING_LEN] = h[i]   # confirmado SWING_LEN barras después

for i in range(SWING_LEN, n - SWING_LEN):
    window_l = l[i - SWING_LEN: i + SWING_LEN + 1]
    if l[i] == window_l.min():
        pl[i + SWING_LEN] = l[i]

# ═══════════════════════════════════════════════════════════
# BACKTEST LOOP PRINCIPAL
# ═══════════════════════════════════════════════════════════
equity      = INITIAL_CAP
equity_curve= [INITIAL_CAP]
trades      = []

# Estado de estructura
last_ph = last_pl = prev_ph = prev_pl = np.nan
hh_val = hl_val = ll_val = lh_val = np.nan
trend = 0
bos_dir = 0
was_choch = False

# OB activo (solo el más reciente no mitigado de cada tipo)
ob_bull = None  # (top, bot, bar_idx)
ob_bear = None

# Posición abierta
pos = None  # {'dir': 1/-1, 'entry': float, 'sl': float, 'tp': float, 'size': float, 'bar': int}

START = max(ATR_LEN * 2, SWING_LEN * 2 + 5)

for i in range(START, n):
    atr_i    = atr[i]
    if np.isnan(atr_i):
        equity_curve.append(equity)
        continue

    # — Actualizar estructura con pivot confirmado en esta barra
    if not np.isnan(ph[i]):
        prev_ph = last_ph
        last_ph = ph[i]

    if not np.isnan(pl[i]):
        prev_pl = last_pl
        last_pl = pl[i]

    new_hh = (not np.isnan(ph[i]) and not np.isnan(prev_ph) and last_ph > prev_ph)
    new_lh = (not np.isnan(ph[i]) and not np.isnan(prev_ph) and last_ph < prev_ph)
    new_hl = (not np.isnan(pl[i]) and not np.isnan(prev_pl) and last_pl > prev_pl)
    new_ll = (not np.isnan(pl[i]) and not np.isnan(prev_pl) and last_pl < prev_pl)

    if (new_hh or new_hl) and not (new_ll or new_lh):
        was_choch = (trend == -1)
        bos_dir   = 1
        trend     = 1
        hh_val    = last_ph
        hl_val    = last_pl

    if (new_ll or new_lh) and not (new_hh or new_hl):
        was_choch = (trend == 1)
        bos_dir   = -1
        trend     = -1
        ll_val    = last_pl
        lh_val    = last_ph

    # — Detectar OB en nuevo HH/LL
    # Buscamos la última vela bajista (para bull OB) o alcista (bear OB)
    # dentro de swing_len a swing_len+15 barras antes del pivot confirmado
    if new_hh:
        pivot_bar = i - SWING_LEN   # barra real del pivot
        for k in range(SWING_LEN, SWING_LEN + 16):
            kb = pivot_bar - k
            if kb < 0:
                break
            if c[kb] < o[kb]:   # vela bajista → OB demanda
                ob_bull = (max(o[kb], c[kb]), min(o[kb], c[kb]), kb)
                break

    if new_ll:
        pivot_bar = i - SWING_LEN
        for k in range(SWING_LEN, SWING_LEN + 16):
            kb = pivot_bar - k
            if kb < 0:
                break
            if c[kb] > o[kb]:   # vela alcista → OB oferta
                ob_bear = (max(o[kb], c[kb]), min(o[kb], c[kb]), kb)
                break

    # — Mitigar OBs
    if ob_bull is not None:
        if c[i] < ob_bull[1]:   # precio cierra por debajo del OB bull → mitigado
            ob_bull = None
    if ob_bear is not None:
        if c[i] > ob_bear[0]:   # precio cierra por encima del OB bear → mitigado
            ob_bear = None

    # — Factores F1-F5 y Tasa
    f1 = 0.5
    if trend == 1 and not np.isnan(hh_val) and not np.isnan(hl_val) and atr_i > 0:
        f1 = min((hh_val - hl_val) / (atr_i * 10.0), 1.0)
    elif trend == -1 and not np.isnan(lh_val) and not np.isnan(ll_val) and atr_i > 0:
        f1 = min((lh_val - ll_val) / (atr_i * 10.0), 1.0)

    f2 = 0.5
    if trend == 1 and not np.isnan(hh_val) and not np.isnan(hl_val):
        rng = hh_val - hl_val
        if rng > 0:
            f2 = 1.0 - max(min((c[i] - hl_val) / rng, 1.0), 0.0)
    elif trend == -1 and not np.isnan(lh_val) and not np.isnan(ll_val):
        rng = lh_val - ll_val
        if rng > 0:
            f2 = max(min((c[i] - ll_val) / rng, 1.0), 0.0)

    f3 = 0.5
    if bos_dir != 0:
        if was_choch:
            f3 = 0.65
        elif bos_dir == trend:
            f3 = 1.0
        else:
            f3 = 0.0

    consol_count = 0
    if atr_i > 0:
        for k in range(min(CONSOL_BARS, i)):
            if (h[i-k] - l[i-k]) < atr_i * CONSOL_MULT:
                consol_count += 1
    f4 = 1.0 - consol_count / CONSOL_BARS if atr_i > 0 else 0.5
    f5 = min(vol_rel[i] / 2.0, 1.0)

    tasa = round((f1*0.30 + f2*0.20 + f3*0.25 + f4*0.15 + f5*0.10) * 100)

    # — Gestionar posición abierta
    if pos is not None:
        hit_sl = (pos['dir'] ==  1 and l[i] <= pos['sl']) or \
                 (pos['dir'] == -1 and h[i] >= pos['sl'])
        hit_tp = (pos['dir'] ==  1 and h[i] >= pos['tp']) or \
                 (pos['dir'] == -1 and l[i] <= pos['tp'])

        if hit_sl or hit_tp:
            exit_price = pos['tp'] if hit_tp else pos['sl']
            pnl_raw    = (exit_price - pos['entry']) * pos['dir'] * pos['size']
            comm       = (pos['entry'] + exit_price) * pos['size'] * COMMISSION
            pnl        = pnl_raw - comm

            equity += pnl
            trades.append({
                'entry_bar' : pos['bar'],
                'exit_bar'  : i,
                'dir'       : pos['dir'],
                'entry'     : pos['entry'],
                'exit'      : exit_price,
                'sl'        : pos['sl'],
                'tp'        : pos['tp'],
                'pnl'       : pnl,
                'result'    : 'WIN' if hit_tp else 'LOSS',
                'tasa'      : pos['tasa'],
            })
            pos = None

    # — Señales de entrada (solo si no hay posición abierta)
    if pos is None:
        tol = atr_i * TOUCH_ATR
        vol_ok = (not VOL_FILTER) or (vol_rel[i] >= MIN_VOL_RATIO)

        in_bull_ob = (ob_bull is not None and
                      l[i] <= ob_bull[0] + tol and h[i] >= ob_bull[1] - tol)
        in_bear_ob = (ob_bear is not None and
                      h[i] >= ob_bear[1] - tol and l[i] <= ob_bear[0] + tol)

        long_ok  = (trend ==  1 and tasa >= TASA_MIN and in_bull_ob and vol_ok)
        short_ok = (trend == -1 and tasa >= TASA_MIN and in_bear_ob and vol_ok)

        if long_ok:
            entry  = c[i]
            sl     = ob_bull[1] - atr_i * SL_BUFFER
            risk   = entry - sl
            if risk > 0:
                tp   = entry + risk * TP_RR
                size = (equity * RISK_PCT) / risk
                pos  = {'dir': 1, 'entry': entry, 'sl': sl, 'tp': tp,
                        'size': size, 'bar': i, 'tasa': tasa}
                ob_bull = None   # OB usado

        elif short_ok:
            entry  = c[i]
            sl     = ob_bear[0] + atr_i * SL_BUFFER
            risk   = sl - entry
            if risk > 0:
                tp   = entry - risk * TP_RR
                size = (equity * RISK_PCT) / risk
                pos  = {'dir': -1, 'entry': entry, 'sl': sl, 'tp': tp,
                        'size': size, 'bar': i, 'tasa': tasa}
                ob_bear = None

    equity_curve.append(equity)

# ═══════════════════════════════════════════════════════════
# MÉTRICAS
# ═══════════════════════════════════════════════════════════
df_trades = pd.DataFrame(trades)

if df_trades.empty:
    print("\n⚠  Sin operaciones. Prueba a bajar TASA_MIN o cambiar símbolo/timeframe.")
else:
    total   = len(df_trades)
    wins    = (df_trades['result'] == 'WIN').sum()
    losses  = (df_trades['result'] == 'LOSS').sum()
    wr      = wins / total * 100
    gross_p = df_trades.loc[df_trades['pnl'] > 0, 'pnl'].sum()
    gross_l = abs(df_trades.loc[df_trades['pnl'] < 0, 'pnl'].sum())
    pf      = gross_p / gross_l if gross_l > 0 else float('inf')
    net_pnl = df_trades['pnl'].sum()
    net_pct = net_pnl / INITIAL_CAP * 100

    eq_arr  = np.array(equity_curve)
    peak    = np.maximum.accumulate(eq_arr)
    dd_arr  = (peak - eq_arr) / peak * 100
    max_dd  = dd_arr.max()

    avg_win  = df_trades.loc[df_trades['result']=='WIN',  'pnl'].mean()
    avg_loss = df_trades.loc[df_trades['result']=='LOSS', 'pnl'].mean()
    expectancy = (wr/100 * avg_win) + ((1 - wr/100) * avg_loss)

    print("\n" + "═"*52)
    print(f"  SENSEI PRO OB — BACKTEST  {SYMBOL}  {INTERVAL}")
    print("═"*52)
    print(f"  Período       : {raw['date'].iloc[0].date()} → {raw['date'].iloc[-1].date()}")
    print(f"  Velas totales : {n}")
    print(f"  Capital inicial: ${INITIAL_CAP:,.0f}")
    print("─"*52)
    print(f"  Operaciones   : {total}  ({wins}W / {losses}L)")
    print(f"  Win Rate      : {wr:.1f}%")
    print(f"  Profit Factor : {pf:.2f}")
    print(f"  Net Profit    : ${net_pnl:,.2f}  ({net_pct:+.1f}%)")
    print(f"  Capital final : ${equity:,.2f}")
    print(f"  Max Drawdown  : {max_dd:.1f}%")
    print(f"  Avg WIN       : ${avg_win:,.2f}")
    print(f"  Avg LOSS      : ${avg_loss:,.2f}")
    print(f"  Expectancy    : ${expectancy:,.2f} / trade")
    print("═"*52)

    # ═══════════════════════════════════════════════════════
    # GRÁFICO
    # ═══════════════════════════════════════════════════════
    dates = raw['date'].values

    fig = plt.figure(figsize=(16, 10), facecolor='#0D1117')
    gs  = gridspec.GridSpec(3, 1, height_ratios=[3, 1, 1.2], hspace=0.08)

    ax1 = fig.add_subplot(gs[0])   # precio
    ax2 = fig.add_subplot(gs[1])   # drawdown
    ax3 = fig.add_subplot(gs[2])   # equity

    for ax in [ax1, ax2, ax3]:
        ax.set_facecolor('#0D1117')
        ax.tick_params(colors='#8B949E', labelsize=8)
        ax.spines[:].set_color('#30363D')

    # — Precio (velas simplificadas = línea de cierre)
    ax1.plot(range(n), c, color='#58A6FF', linewidth=0.8, alpha=0.9)

    # Marcar trades
    for _, t in df_trades.iterrows():
        col_e = '#00E5FF' if t['dir'] == 1 else '#FF1744'
        col_x = '#26A69A' if t['result'] == 'WIN' else '#EF5350'
        ax1.scatter(t['entry_bar'], t['entry'], color=col_e, s=30, zorder=5, marker='^' if t['dir']==1 else 'v')
        ax1.scatter(t['exit_bar'],  t['exit'],  color=col_x, s=30, zorder=5, marker='o')
        ax1.plot([t['entry_bar'], t['exit_bar']], [t['entry'], t['exit']],
                 color=col_x, alpha=0.3, linewidth=0.8)

    ax1.set_title(f"SENSEI PRO OB · {SYMBOL} {INTERVAL} · {total} trades  |  "
                  f"WR {wr:.1f}%  PF {pf:.2f}  Net {net_pct:+.1f}%  MaxDD {max_dd:.1f}%",
                  color='#E6EDF3', fontsize=11, pad=8)
    ax1.set_ylabel("Precio", color='#8B949E', fontsize=8)
    ax1.set_xlim(0, n)

    # — Drawdown
    ax2.fill_between(range(len(dd_arr)), -dd_arr, 0,
                     color='#EF5350', alpha=0.5)
    ax2.plot(range(len(dd_arr)), -dd_arr, color='#EF5350', linewidth=0.6)
    ax2.set_ylabel("DD %", color='#8B949E', fontsize=8)
    ax2.set_xlim(0, n)
    ax2.axhline(0, color='#30363D', linewidth=0.5)

    # — Equity curve
    ax3.plot(range(len(equity_curve)), equity_curve,
             color='#26A69A', linewidth=1.2)
    ax3.fill_between(range(len(equity_curve)), INITIAL_CAP, equity_curve,
                     where=np.array(equity_curve) >= INITIAL_CAP,
                     color='#26A69A', alpha=0.15)
    ax3.fill_between(range(len(equity_curve)), INITIAL_CAP, equity_curve,
                     where=np.array(equity_curve) < INITIAL_CAP,
                     color='#EF5350', alpha=0.15)
    ax3.axhline(INITIAL_CAP, color='#30363D', linewidth=0.7, linestyle='--')
    ax3.set_ylabel("Equity $", color='#8B949E', fontsize=8)
    ax3.set_xlabel("Barra", color='#8B949E', fontsize=8)
    ax3.set_xlim(0, n)

    out = "/home/user/maicol/backtest_result.png"
    plt.savefig(out, dpi=150, bbox_inches='tight', facecolor='#0D1117')
    print(f"\n  Gráfico guardado: {out}")
    plt.close()

    # — Tabla de operaciones resumida
    print(f"\n{'Bar':>6} {'Dir':>5} {'Entry':>10} {'Exit':>10} {'PnL':>10} {'Res':>6}")
    print("─"*52)
    for _, t in df_trades.iterrows():
        d = "LONG" if t['dir'] == 1 else "SHORT"
        print(f"{int(t['entry_bar']):>6} {d:>5} {t['entry']:>10.2f} {t['exit']:>10.2f} "
              f"{t['pnl']:>+10.2f} {t['result']:>6}")
