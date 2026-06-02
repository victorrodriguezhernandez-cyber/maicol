// SENSEI ZONES — Canvas chart renderer (TradingView-style dark theme)
import { isNYSession } from './zones.js';

const COLORS = {
    bg:         '#0a0b0d',
    bgPanel:    '#0e1117',
    grid:       '#1a1d27',
    axis:       '#2a2d3a',
    text:       '#8892a4',
    textBright: '#c5cad8',
    green:      '#26a69a',
    red:        '#ef5350',
    accent:     '#7c83ff',
    gold:       '#f0b429',
    crosshair:  '#4a5060',
    supply:     'rgba(239,83,80,0.18)',
    supplyBorder:'rgba(239,83,80,0.6)',
    demand:     'rgba(38,166,154,0.18)',
    demandBorder:'rgba(38,166,154,0.6)',
    nyShadow:   'rgba(124,131,255,0.05)',
    volume:     'rgba(100,110,140,0.5)',
    volGreen:   'rgba(38,166,154,0.5)',
    volRed:     'rgba(239,83,80,0.5)',
};

export class SenseiChart {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');

        // Layout constants
        this.R_AXIS  = 82;   // right price axis width
        this.B_AXIS  = 36;   // bottom time axis height
        this.TOP_PAD = 18;
        this.VOL_RATIO = 0.18; // volume panel fraction of total chart height

        // Data
        this.candles      = [];
        this.atrs         = [];
        this.supplyZone   = null;
        this.demandZone   = null;
        this.nearestHigh  = null;
        this.nearestLow   = null;
        this.bosEvents    = []; // [{ index, direction:'up'|'down', price }]
        this.currentPrice = null;

        // View — indices into candles[]
        this.viewStart = 0;
        this.viewCount = 120;

        // Interaction
        this.isDragging   = false;
        this.dragStartX   = 0;
        this.dragStartView= 0;
        this.mouseX       = -1;
        this.mouseY       = -1;
        this.hoveredCandle= null;

        // Resize observer
        this._ro = new ResizeObserver(() => this._resize());
        this._ro.observe(canvas.parentElement || canvas);
        this._resize();

        this._bindEvents();
        this._loop();
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    setCandles(candles) {
        this.candles = candles;
        this._clampView();
        // Default view: last 120 candles
        this.viewCount = Math.min(120, candles.length);
        this.viewStart = Math.max(0, candles.length - this.viewCount);
    }

    updateLastCandle(candle) {
        if (this.candles.length === 0) { this.candles.push(candle); return; }
        const last = this.candles[this.candles.length - 1];
        if (last.time === candle.time) {
            this.candles[this.candles.length - 1] = candle;
        } else {
            this.candles.push(candle);
            this._clampView();
            // Auto-scroll if user is near the right edge
            const tail = this.viewStart + this.viewCount;
            if (tail >= this.candles.length - 2) {
                this.viewStart = Math.max(0, this.candles.length - this.viewCount);
            }
        }
        this.currentPrice = candle.close;
    }

    setZones(supply, demand) {
        this.supplyZone = supply;
        this.demandZone = demand;
    }

    setLevels(high, low) {
        this.nearestHigh = high;
        this.nearestLow  = low;
    }

    addBOS(event) {
        this.bosEvents.push(event);
        if (this.bosEvents.length > 20) this.bosEvents.shift();
    }

    setATRs(atrs) { this.atrs = atrs; }

    // ─── Layout helpers ───────────────────────────────────────────────────────

    _resize() {
        const parent = this.canvas.parentElement || document.body;
        const rect   = parent.getBoundingClientRect();
        this.canvas.width  = Math.floor(rect.width)  || 800;
        this.canvas.height = Math.floor(rect.height) || 500;
        this._computeLayout();
    }

    _computeLayout() {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const totalH = H - this.B_AXIS - this.TOP_PAD;
        this.volH    = Math.floor(totalH * this.VOL_RATIO);
        this.chartH  = totalH - this.volH - 4; // 4px gap
        this.chartW  = W - this.R_AXIS;
        this.chartTop    = this.TOP_PAD;
        this.chartBottom = this.TOP_PAD + this.chartH;
        this.volTop      = this.chartBottom + 4;
        this.volBottom   = this.volTop + this.volH;
    }

    _clampView() {
        const n = this.candles.length;
        this.viewCount = Math.max(20, Math.min(this.viewCount, n));
        this.viewStart = Math.max(0, Math.min(this.viewStart, n - this.viewCount));
    }

    // ─── Coordinate transforms ────────────────────────────────────────────────

    _candleX(idx) {
        const cw = this.chartW / this.viewCount;
        return (idx - this.viewStart) * cw + cw * 0.5;
    }

    _priceY(price, pMin, pMax) {
        const pRange = pMax - pMin || 1;
        return this.chartTop + (1 - (price - pMin) / pRange) * this.chartH;
    }

    _volY(vol, maxVol) {
        if (maxVol === 0) return this.volBottom;
        return this.volBottom - (vol / maxVol) * this.volH;
    }

    _xToIndex(px) {
        const cw = this.chartW / this.viewCount;
        return Math.round(px / cw - 0.5) + this.viewStart;
    }

    // ─── Price range from visible candles ─────────────────────────────────────

    _visibleRange() {
        const end = Math.min(this.viewStart + this.viewCount, this.candles.length);
        let pMin = Infinity, pMax = -Infinity, vMax = 0;
        for (let i = this.viewStart; i < end; i++) {
            const c = this.candles[i];
            if (c.high > pMax) pMax = c.high;
            if (c.low  < pMin) pMin = c.low;
            if (c.volume > vMax) vMax = c.volume;
        }
        // Include zone levels in range
        if (this.supplyZone) { pMax = Math.max(pMax, this.supplyZone.top); }
        if (this.demandZone) { pMin = Math.min(pMin, this.demandZone.bottom); }
        if (this.nearestHigh) pMax = Math.max(pMax, this.nearestHigh);
        if (this.nearestLow)  pMin = Math.min(pMin, this.nearestLow);

        const pad = (pMax - pMin) * 0.06;
        return { pMin: pMin - pad, pMax: pMax + pad, vMax };
    }

    // ─── Main render ─────────────────────────────────────────────────────────

    _render() {
        if (this.candles.length === 0) { this._renderEmpty(); return; }
        this._computeLayout();

        const ctx  = this.ctx;
        const W    = this.canvas.width;
        const H    = this.canvas.height;
        const { pMin, pMax, vMax } = this._visibleRange();
        const cw   = this.chartW / this.viewCount;
        const end  = Math.min(this.viewStart + this.viewCount, this.candles.length);

        // ── Background
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, W, H);

        // ── Grid
        this._drawGrid(pMin, pMax);

        // ── NY session shading
        this._drawNYShading(pMin, pMax, cw, end);

        // ── Volume bars
        this._drawVolume(vMax, cw, end);

        // ── Demand zone
        if (this.demandZone) this._drawZone(this.demandZone, pMin, pMax, cw);

        // ── Supply zone
        if (this.supplyZone) this._drawZone(this.supplyZone, pMin, pMax, cw);

        // ── Levels H/L
        if (this.nearestHigh != null) this._drawLevel(this.nearestHigh, pMin, pMax, 'H', COLORS.red);
        if (this.nearestLow  != null) this._drawLevel(this.nearestLow,  pMin, pMax, 'L', COLORS.green);

        // ── BOS labels
        this._drawBOS(pMin, pMax, cw);

        // ── Candles
        this._drawCandles(pMin, pMax, cw, end);

        // ── Current price line
        if (this.currentPrice != null) {
            this._drawCurrentPriceLine(this.currentPrice, pMin, pMax);
        }

        // ── Price axis
        this._drawPriceAxis(pMin, pMax);

        // ── Time axis
        this._drawTimeAxis(cw, end);

        // ── Crosshair + OHLC tooltip
        if (this.mouseX >= 0 && this.mouseX < this.chartW) {
            this._drawCrosshair(pMin, pMax);
        }

        // ── Volume divider
        ctx.strokeStyle = COLORS.axis;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, this.volTop - 2);
        ctx.lineTo(this.chartW, this.volTop - 2);
        ctx.stroke();
    }

    _renderEmpty() {
        const ctx = this.ctx;
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = COLORS.text;
        ctx.font = '14px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Conectando a Binance...', this.canvas.width / 2, this.canvas.height / 2);
        ctx.textAlign = 'left';
    }

    _drawGrid(pMin, pMax) {
        const ctx = this.ctx;
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;

        // Horizontal grid lines (price)
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
            const price = pMin + (pMax - pMin) * (i / steps);
            const y = this._priceY(price, pMin, pMax);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.chartW, y);
            ctx.stroke();
        }

        // Vertical grid lines (time)
        const cw = this.chartW / this.viewCount;
        const interval = Math.max(1, Math.round(24 / (cw / 10)));
        for (let i = 0; i < this.viewCount; i += interval) {
            const x = this._candleX(this.viewStart + i);
            ctx.beginPath();
            ctx.moveTo(x, this.chartTop);
            ctx.lineTo(x, this.volBottom);
            ctx.stroke();
        }
    }

    _drawNYShading(pMin, pMax, cw, end) {
        const ctx = this.ctx;
        ctx.fillStyle = COLORS.nyShadow;
        for (let i = this.viewStart; i < end; i++) {
            if (isNYSession(this.candles[i].time)) {
                const x = this._candleX(i) - cw / 2;
                ctx.fillRect(x, this.chartTop, cw, this.chartH + this.volH + 4);
            }
        }
    }

    _drawVolume(vMax, cw, end) {
        const ctx = this.ctx;
        const barW = Math.max(1, cw - 1);
        for (let i = this.viewStart; i < end; i++) {
            const c   = this.candles[i];
            const x   = this._candleX(i);
            const y   = this._volY(c.volume, vMax);
            const h   = this.volBottom - y;
            ctx.fillStyle = c.close >= c.open ? COLORS.volGreen : COLORS.volRed;
            ctx.fillRect(x - barW / 2, y, barW, h);
        }
    }

    _drawZone(zone, pMin, pMax, cw) {
        const ctx   = this.ctx;
        const isS   = zone.type === 'supply';
        const color = isS ? COLORS.supply       : COLORS.demand;
        const border= isS ? COLORS.supplyBorder : COLORS.demandBorder;

        // Zone extends from its left index to the right edge of the chart
        const x1 = Math.max(0, this._candleX(zone.leftIndex) - cw / 2);
        const x2 = this.chartW + this.R_AXIS; // extend to right edge
        const y1 = this._priceY(zone.top,    pMin, pMax);
        const y2 = this._priceY(zone.bottom, pMin, pMax);

        ctx.fillStyle = color;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

        // Top and bottom borders
        ctx.strokeStyle = border;
        ctx.lineWidth   = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y1);
        ctx.moveTo(x1, y2); ctx.lineTo(x2, y2);
        ctx.stroke();

        // Label
        ctx.font      = '10px JetBrains Mono, monospace';
        ctx.fillStyle = border;
        ctx.textAlign = 'right';
        const label = isS ? 'SUPPLY' : 'DEMAND';
        ctx.fillText(label, this.chartW - 4, isS ? y1 - 3 : y2 + 11);
        ctx.textAlign = 'left';
    }

    _drawLevel(price, pMin, pMax, label, color) {
        const ctx = this.ctx;
        const y   = this._priceY(price, pMin, pMax);
        if (y < this.chartTop || y > this.chartBottom) return;

        ctx.strokeStyle = color;
        ctx.lineWidth   = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.chartW + this.R_AXIS, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label pill on right axis
        ctx.fillStyle = color;
        ctx.font      = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(label, this.chartW + 4, y + 4);
    }

    _drawBOS(pMin, pMax, cw) {
        const ctx = this.ctx;
        ctx.font      = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        for (const ev of this.bosEvents) {
            if (ev.index < this.viewStart || ev.index >= this.viewStart + this.viewCount) continue;
            const x = this._candleX(ev.index);
            const y = this._priceY(ev.price, pMin, pMax);
            ctx.fillStyle   = ev.direction === 'up' ? COLORS.green : COLORS.red;
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth   = 1;

            // Small pill
            const text = 'BOS';
            const tw = ctx.measureText(text).width + 8;
            const ty = ev.direction === 'up' ? y - 18 : y + 10;
            ctx.beginPath();
            ctx.roundRect(x - tw / 2, ty, tw, 14, 3);
            ctx.globalAlpha = 0.85;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.fillText(text, x, ty + 10);
        }
        ctx.textAlign = 'left';
    }

    _drawCandles(pMin, pMax, cw, end) {
        const ctx  = this.ctx;
        const barW = Math.max(1, cw * 0.7);

        for (let i = this.viewStart; i < end; i++) {
            const c = this.candles[i];
            const x = this._candleX(i);
            const isGreen = c.close >= c.open;
            const color   = isGreen ? COLORS.green : COLORS.red;

            const yO = this._priceY(c.open,  pMin, pMax);
            const yC = this._priceY(c.close, pMin, pMax);
            const yH = this._priceY(c.high,  pMin, pMax);
            const yL = this._priceY(c.low,   pMin, pMax);

            // Wick
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.moveTo(x, yH);
            ctx.lineTo(x, yL);
            ctx.stroke();

            // Body
            const bodyTop = Math.min(yO, yC);
            const bodyH   = Math.max(1, Math.abs(yC - yO));
            ctx.fillStyle = color;
            ctx.fillRect(x - barW / 2, bodyTop, barW, bodyH);
        }
    }

    _drawCurrentPriceLine(price, pMin, pMax) {
        const ctx = this.ctx;
        const y   = this._priceY(price, pMin, pMax);
        if (y < this.chartTop || y > this.chartBottom) return;

        const lastCandle = this.candles[this.candles.length - 1];
        const isUp = !lastCandle || lastCandle.close >= lastCandle.open;
        const col  = isUp ? COLORS.green : COLORS.red;

        ctx.strokeStyle = col;
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.chartW, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Price tag on axis
        ctx.fillStyle   = col;
        ctx.fillRect(this.chartW, y - 9, this.R_AXIS, 18);
        ctx.fillStyle   = '#fff';
        ctx.font        = '10px JetBrains Mono, monospace';
        ctx.textAlign   = 'center';
        ctx.fillText(price.toFixed(1), this.chartW + this.R_AXIS / 2, y + 4);
        ctx.textAlign   = 'left';
    }

    _drawPriceAxis(pMin, pMax) {
        const ctx = this.ctx;
        ctx.fillStyle = COLORS.bgPanel;
        ctx.fillRect(this.chartW, 0, this.R_AXIS, this.canvas.height);
        ctx.strokeStyle = COLORS.axis;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(this.chartW, 0);
        ctx.lineTo(this.chartW, this.canvas.height);
        ctx.stroke();

        ctx.fillStyle  = COLORS.text;
        ctx.font       = '10px JetBrains Mono, monospace';
        ctx.textAlign  = 'right';

        const steps = 6;
        for (let i = 0; i <= steps; i++) {
            const price = pMin + (pMax - pMin) * (i / steps);
            const y     = this._priceY(price, pMin, pMax);
            if (y < this.chartTop || y > this.chartBottom) continue;
            ctx.fillText(price.toFixed(1), this.chartW + this.R_AXIS - 6, y + 4);
        }
        ctx.textAlign = 'left';
    }

    _drawTimeAxis(cw, end) {
        const ctx   = this.ctx;
        ctx.fillStyle = COLORS.bgPanel;
        ctx.fillRect(0, this.canvas.height - this.B_AXIS, this.canvas.width, this.B_AXIS);
        ctx.strokeStyle = COLORS.axis;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(0, this.canvas.height - this.B_AXIS);
        ctx.lineTo(this.canvas.width, this.canvas.height - this.B_AXIS);
        ctx.stroke();

        ctx.fillStyle  = COLORS.text;
        ctx.font       = '9px JetBrains Mono, monospace';
        ctx.textAlign  = 'center';

        // Show label every N candles so labels don't overlap
        const minPx    = 70;
        const interval = Math.max(1, Math.ceil(minPx / cw));

        for (let i = this.viewStart; i < end; i += interval) {
            const c = this.candles[i];
            if (!c) continue;
            const x   = this._candleX(i);
            const d   = new Date(c.time);
            const hh  = String(d.getUTCHours()).padStart(2, '0');
            const mm  = String(d.getUTCMinutes()).padStart(2, '0');
            const dd  = `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
            const lbl = cw < 6 ? dd : `${hh}:${mm}`;
            ctx.fillText(lbl, x, this.canvas.height - this.B_AXIS + 14);
        }
        ctx.textAlign = 'left';
    }

    _drawCrosshair(pMin, pMax) {
        const ctx  = this.ctx;
        const x    = this.mouseX;
        const y    = this.mouseY;

        ctx.strokeStyle = COLORS.crosshair;
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 4]);

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(x, this.chartTop);
        ctx.lineTo(x, this.volBottom);
        ctx.stroke();

        // Horizontal line (only inside chart)
        if (y >= this.chartTop && y <= this.chartBottom) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.chartW, y);
            ctx.stroke();

            // Price tag on axis
            const price = pMin + (1 - (y - this.chartTop) / this.chartH) * (pMax - pMin);
            ctx.setLineDash([]);
            ctx.fillStyle = COLORS.crosshair;
            ctx.fillRect(this.chartW, y - 9, this.R_AXIS, 18);
            ctx.fillStyle = COLORS.textBright;
            ctx.font      = '10px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(price.toFixed(1), this.chartW + this.R_AXIS / 2, y + 4);
            ctx.textAlign = 'left';
        }

        ctx.setLineDash([]);

        // OHLC tooltip
        const idx = this._xToIndex(x);
        if (idx >= 0 && idx < this.candles.length) {
            const c    = this.candles[idx];
            const isUp = c.close >= c.open;
            this._drawOHLCTooltip(c, isUp);
        }
    }

    _drawOHLCTooltip(c, isUp) {
        const ctx = this.ctx;
        const pad = 8;
        const lineH = 15;
        const d   = new Date(c.time);
        const ts  = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
        const lines = [
            ts,
            `O ${c.open.toFixed(2)}  H ${c.high.toFixed(2)}`,
            `L ${c.low.toFixed(2)}  C ${c.close.toFixed(2)}`,
            `Vol ${(c.volume / 1000).toFixed(1)}K`
        ];

        ctx.font = '10px JetBrains Mono, monospace';
        const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
        const boxW = maxW + pad * 2;
        const boxH = lines.length * lineH + pad * 2 - 2;

        // Position top-left unless too close to edges
        let bx = 10;
        let by = this.chartTop + 6;
        if (this.mouseX < boxW + 20) bx = this.chartW - boxW - 10;

        ctx.fillStyle   = 'rgba(14,17,23,0.9)';
        ctx.strokeStyle = isUp ? COLORS.green : COLORS.red;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.textBright;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], bx + pad, by + pad + i * lineH + 10);
        }
    }

    // ─── Event bindings ───────────────────────────────────────────────────────

    _bindEvents() {
        const el = this.canvas;

        el.addEventListener('wheel', e => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 1.12 : 0.89;
            const cursorFrac = this.mouseX / this.chartW;
            const newCount   = Math.round(Math.max(20, Math.min(
                this.candles.length,
                this.viewCount * zoomFactor
            )));
            // Anchor zoom around cursor position
            const anchorIdx  = this.viewStart + cursorFrac * this.viewCount;
            this.viewCount   = newCount;
            this.viewStart   = Math.round(anchorIdx - cursorFrac * newCount);
            this._clampView();
        }, { passive: false });

        el.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            this.isDragging    = true;
            this.dragStartX    = e.clientX;
            this.dragStartView = this.viewStart;
            el.style.cursor    = 'grabbing';
        });

        window.addEventListener('mouseup', () => {
            this.isDragging  = false;
            el.style.cursor  = 'crosshair';
        });

        window.addEventListener('mousemove', e => {
            const rect = el.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;

            if (this.isDragging) {
                const dx      = e.clientX - this.dragStartX;
                const cw      = this.chartW / this.viewCount;
                const shifted = Math.round(-dx / cw);
                this.viewStart = Math.max(0, Math.min(
                    this.candles.length - this.viewCount,
                    this.dragStartView + shifted
                ));
            }
        });

        el.addEventListener('mouseleave', () => {
            this.mouseX = -1;
            this.mouseY = -1;
        });

        el.style.cursor = 'crosshair';
    }

    // ─── Render loop ──────────────────────────────────────────────────────────

    _loop() {
        this._render();
        requestAnimationFrame(() => this._loop());
    }
}
