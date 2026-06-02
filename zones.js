// SENSEI ZONES — Zone detection logic (faithful translation of Pine Script v0.6.1)

// ─── ATR (Wilder's RMA) ─────────────────────────────────────────────────────
export function calculateATR(candles, period = 14) {
    if (candles.length < 2) return [];
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
        const c = candles[i], p = candles[i - 1];
        trs.push(Math.max(
            c.high - c.low,
            Math.abs(c.high - p.close),
            Math.abs(c.low - p.close)
        ));
    }
    const atrs = new Array(candles.length).fill(NaN);
    // Seed with simple average of first `period` TRs
    let sum = 0;
    for (let i = 0; i < Math.min(period, trs.length); i++) sum += trs[i];
    if (trs.length < period) return atrs;
    atrs[period] = sum / period; // atrs[i] corresponds to candles[i]
    for (let i = period; i < trs.length; i++) {
        atrs[i + 1] = (atrs[i] * (period - 1) + trs[i]) / period;
    }
    return atrs;
}

// ─── Pivot Highs ────────────────────────────────────────────────────────────
// Returns array of { index, price } for confirmed pivot highs
export function findPivotHighs(candles, pivotLen = 5) {
    const pivots = [];
    for (let i = pivotLen; i < candles.length - pivotLen; i++) {
        let isPivot = true;
        const ph = candles[i].high;
        for (let j = i - pivotLen; j <= i + pivotLen; j++) {
            if (j !== i && candles[j].high >= ph) { isPivot = false; break; }
        }
        if (isPivot) pivots.push({ index: i, price: ph });
    }
    return pivots;
}

// ─── Pivot Lows ─────────────────────────────────────────────────────────────
export function findPivotLows(candles, pivotLen = 5) {
    const pivots = [];
    for (let i = pivotLen; i < candles.length - pivotLen; i++) {
        let isPivot = true;
        const pl = candles[i].low;
        for (let j = i - pivotLen; j <= i + pivotLen; j++) {
            if (j !== i && candles[j].low <= pl) { isPivot = false; break; }
        }
        if (isPivot) pivots.push({ index: i, price: pl });
    }
    return pivots;
}

// ─── Nearest H/L Levels ─────────────────────────────────────────────────────
export function getNearestHigh(candles, atrs, pivotHighs, params = {}) {
    const {
        levelLookback = 80,
        minGapATR = 0.10,
        maxDistATR = 5.00
    } = params;

    const n = candles.length;
    const currentClose = candles[n - 1].close;
    const atr = atrs[n - 1];
    if (!atr || isNaN(atr)) return null;

    let nearest = null;
    let bestDist = Infinity;

    for (const ph of pivotHighs) {
        const age = (n - 1) - ph.index;
        const dist = ph.price - currentClose;
        if (
            age <= levelLookback &&
            ph.price > currentClose + atr * minGapATR &&
            dist <= atr * maxDistATR &&
            dist < bestDist
        ) {
            nearest = ph.price;
            bestDist = dist;
        }
    }
    return nearest;
}

export function getNearestLow(candles, atrs, pivotLows, params = {}) {
    const {
        levelLookback = 80,
        minGapATR = 0.10,
        maxDistATR = 5.00
    } = params;

    const n = candles.length;
    const currentClose = candles[n - 1].close;
    const atr = atrs[n - 1];
    if (!atr || isNaN(atr)) return null;

    let nearest = null;
    let bestDist = Infinity;

    for (const pl of pivotLows) {
        const age = (n - 1) - pl.index;
        const dist = currentClose - pl.price;
        if (
            age <= levelLookback &&
            pl.price < currentClose - atr * minGapATR &&
            dist <= atr * maxDistATR &&
            dist < bestDist
        ) {
            nearest = pl.price;
            bestDist = dist;
        }
    }
    return nearest;
}

// ─── Supply Zone Detection ───────────────────────────────────────────────────
// Looks back for a compact consolidation followed by a downward impulse,
// with current price already below zone bottom (faithful to Pine Script).
export function detectSupplyZone(candles, atrs, params = {}) {
    const {
        zoneBars = 5,
        zoneLookback = 50,
        maxZoneATR = 1.20,
        minMoveATR = 1.00
    } = params;

    const n = candles.length;
    if (n < zoneLookback + zoneBars) return null;

    const current = candles[n - 1];
    const atr = atrs[n - 1];
    if (!atr || isNaN(atr)) return null;

    // Pine: for i = zoneBars to zoneLookback
    //   high[i-j] where j = 0..zoneBars-1  => indices n-1-i+j (more recent bars included)
    for (let i = zoneBars; i <= zoneLookback; i++) {
        const baseIdx = n - 1 - i; // oldest bar of the base
        if (baseIdx < 0) break;

        let bHigh = candles[baseIdx].high;
        let bLow  = candles[baseIdx].low;

        // Inner loop matches Pine: high[i - j] for j = 0..zoneBars-1
        for (let j = 0; j < zoneBars; j++) {
            const idx = n - 1 - (i - j);
            if (idx >= 0 && idx < n) {
                bHigh = Math.max(bHigh, candles[idx].high);
                bLow  = Math.min(bLow,  candles[idx].low);
            }
        }

        const height    = bHigh - bLow;
        const moveDown  = bLow - current.low;   // Pine: bLow - low[0]
        const compact   = height   <= atr * maxZoneATR;
        const impulse   = moveDown >= atr * minMoveATR;
        const priceBelow = current.close < bLow;

        if (compact && impulse && priceBelow) {
            return {
                type: 'supply',
                top:       bHigh,
                bottom:    bLow,
                leftIndex: baseIdx,
                height,
                atr
            };
        }
    }
    return null;
}

// ─── Demand Zone Detection ───────────────────────────────────────────────────
export function detectDemandZone(candles, atrs, params = {}) {
    const {
        zoneBars = 5,
        zoneLookback = 50,
        maxZoneATR = 1.20,
        minMoveATR = 1.00
    } = params;

    const n = candles.length;
    if (n < zoneLookback + zoneBars) return null;

    const current = candles[n - 1];
    const atr = atrs[n - 1];
    if (!atr || isNaN(atr)) return null;

    for (let i = zoneBars; i <= zoneLookback; i++) {
        const baseIdx = n - 1 - i;
        if (baseIdx < 0) break;

        let bHigh = candles[baseIdx].high;
        let bLow  = candles[baseIdx].low;

        for (let j = 0; j < zoneBars; j++) {
            const idx = n - 1 - (i - j);
            if (idx >= 0 && idx < n) {
                bHigh = Math.max(bHigh, candles[idx].high);
                bLow  = Math.min(bLow,  candles[idx].low);
            }
        }

        const height    = bHigh - bLow;
        const moveUp    = current.high - bHigh;  // Pine: high[0] - bHigh
        const compact   = height  <= atr * maxZoneATR;
        const impulse   = moveUp  >= atr * minMoveATR;
        const priceAbove = current.close > bHigh;

        if (compact && impulse && priceAbove) {
            return {
                type: 'demand',
                top:       bHigh,
                bottom:    bLow,
                leftIndex: baseIdx,
                height,
                atr
            };
        }
    }
    return null;
}

// ─── Zone Invalidation Check ─────────────────────────────────────────────────
export function isZoneInvalidated(zone, candles, atrs) {
    const n = candles.length;
    const current = candles[n - 1];
    const atr = atrs[n - 1];
    if (!atr || isNaN(atr)) return false;
    const margin = atr * 0.1;

    if (zone.type === 'supply') {
        // Invalidated if close is ABOVE zone top with margin
        return current.close > zone.top + margin;
    } else {
        // Invalidated if close is BELOW zone bottom with margin
        return current.close < zone.bottom - margin;
    }
}

// ─── Zone Virgin Check ───────────────────────────────────────────────────────
// A zone is touched if price entered the zone box after its formation
export function checkZoneTouched(zone, candles) {
    for (let i = zone.leftIndex + 1; i < candles.length - 1; i++) {
        const c = candles[i];
        if (zone.type === 'supply' && c.high >= zone.bottom) return true;
        if (zone.type === 'demand' && c.low <= zone.top) return true;
    }
    return false;
}

// ─── BOS Detection ───────────────────────────────────────────────────────────
export function detectBOS(candles, atrs, nearestHigh, nearestLow) {
    const n = candles.length;
    if (n < 2) return { bosUp: false, bosDown: false };
    const current = candles[n - 1];
    const prev    = candles[n - 2];
    const atr = atrs[n - 1];
    if (!atr || isNaN(atr)) return { bosUp: false, bosDown: false };

    const margin = atr * 0.10;
    const bosUp   = nearestHigh != null && current.close > nearestHigh + margin
                    && prev.close <= nearestHigh + margin;
    const bosDown = nearestLow  != null && current.close < nearestLow  - margin
                    && prev.close >= nearestLow  - margin;

    return { bosUp, bosDown };
}

// ─── Trend Context (simple: last 4×15m candles direction) ────────────────────
export function getTrendContext(candles) {
    const n = candles.length;
    if (n < 5) return 'sideways';
    // Use last 4 candles for a simple higher-high / lower-low determination
    const recent = candles.slice(n - 5, n);
    const first = (recent[0].high + recent[0].low) / 2;
    const last  = (recent[4].high + recent[4].low) / 2;
    if (last > first * 1.001) return 'bullish';
    if (last < first * 0.999) return 'bearish';
    return 'sideways';
}

// ─── NY Session Check ────────────────────────────────────────────────────────
// Shades 13:00–19:00 Europe/Madrid (handles CET/CEST automatically via Intl)
const _madridFmt = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
});

export function isNYSession(timestamp) {
    const parts = _madridFmt.formatToParts(new Date(timestamp));
    const h = parseInt(parts.find(p => p.type === 'hour').value,  10);
    const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
    const totalMin = h * 60 + m;
    return totalMin >= (13 * 60) && totalMin < (19 * 60);
}

export function isNYSessionNow() {
    return isNYSession(Date.now());
}
