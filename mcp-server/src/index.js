#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════
//  sensei-tradingview-mcp
//
//  MCP server that gives Claude read access to EL SENSEI's TradingView data:
//    - Alerts fired by the Pine Script indicator (el_sensei_espanol.pine),
//      captured via the /api/tradingview-webhook endpoint into `tv_alerts`.
//    - Zone history (`zones_history`) already used by the web dashboard
//      (see ../supabase.js) to score order-block / FVG probability.
//
//  This server never trades or writes — every tool here is read-only.
//  Transport: stdio (for Claude Code / Claude Desktop).
// ══════════════════════════════════════════════════════════════════════════

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Same project as supabase.js. Override with env vars if you'd rather not
// rely on the publishable key baked into the repo.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pyiukqeuaxonsrrgbfzq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_MvaYVraw3FqViy9G4nhKSQ_QbFpMudx';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function json(data) {
    return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        structuredContent: data
    };
}

function toolError(message) {
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

const server = new McpServer({
    name: 'sensei-tradingview-mcp',
    version: '1.0.0'
});

// ─── get_recent_tv_alerts ───────────────────────────────────────────────────
server.registerTool(
    'get_recent_tv_alerts',
    {
        title: 'Get recent TradingView alerts',
        description:
            'Returns the most recent alerts fired from TradingView (BOS, CHoCH, tasa de continuación, etc.) ' +
            'that were captured through the /api/tradingview-webhook endpoint into the tv_alerts table. ' +
            'Use this to answer "what has TradingView signaled recently on BTCUSDT" type questions.',
        inputSchema: {
            limit: z.number().int().min(1).max(100).default(20).describe('Max alerts to return, newest first'),
            ticker: z.string().optional().describe('Filter by ticker, e.g. "BINANCE:BTCUSDT"')
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ limit, ticker }) => {
        let query = supabase
            .from('tv_alerts')
            .select('*')
            .order('received_at', { ascending: false })
            .limit(limit ?? 20);

        if (ticker) query = query.eq('ticker', ticker);

        const { data, error } = await query;
        if (error) {
            return toolError(
                `${error.message}. If this says the relation does not exist, run sql/tv_alerts.sql ` +
                    'in the Supabase SQL editor first, and make sure the webhook has received at least one alert.'
            );
        }
        return json({ count: data.length, alerts: data });
    }
);

// ─── get_recent_zones ───────────────────────────────────────────────────────
server.registerTool(
    'get_recent_zones',
    {
        title: 'Get recent SENSEI zones',
        description:
            'Returns the most recently detected order-block / FVG zones from the zones_history table ' +
            '(the same data shown in the dashboard sidebar), including whether each is still "virgin" ' +
            '(untouched by price) and its outcome once known (respected/broke/pending).',
        inputSchema: {
            limit: z.number().int().min(1).max(100).default(10).describe('Max zones to return, newest first')
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ limit }) => {
        const { data, error } = await supabase
            .from('zones_history')
            .select('*')
            .order('detected_at', { ascending: false })
            .limit(limit ?? 10);

        if (error) return toolError(error.message);
        return json({ count: data.length, zones: data });
    }
);

// ─── get_zone_probability ───────────────────────────────────────────────────
server.registerTool(
    'get_zone_probability',
    {
        title: 'Get historical probability for a zone profile',
        description:
            'Given a zone type, trend context and height, looks up historically similar zones (±20% height) ' +
            'in zones_history and returns how often they were respected vs. broken — the same calculation ' +
            'the dashboard uses to score a freshly detected zone.',
        inputSchema: {
            zone_type: z.string().describe('Zone type as stored in zones_history, e.g. "bullish_ob", "bearish_fvg"'),
            trend_context: z.string().describe('Trend context as stored in zones_history, e.g. "bullish", "bearish", "neutral"'),
            height: z.number().positive().describe('Zone height (zone_top - zone_bottom) to match similar-sized zones against')
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ zone_type, trend_context, height }) => {
        const heightRatioMin = height * 0.8;
        const heightRatioMax = height * 1.2;

        const { data, error } = await supabase
            .from('zones_history')
            .select('result, is_virgin')
            .eq('zone_type', zone_type)
            .eq('trend_context', trend_context)
            .gte('zone_height', heightRatioMin)
            .lte('zone_height', heightRatioMax)
            .neq('result', 'pending')
            .order('detected_at', { ascending: false })
            .limit(100);

        if (error) return toolError(error.message);

        const respected = (data ?? []).filter((r) => r.result === 'respected').length;
        const broke = (data ?? []).filter((r) => r.result === 'broke').length;
        const total = respected + broke;
        const probability = total > 0 ? Math.round((respected / total) * 100) : null;

        return json({ zone_type, trend_context, height, respected, broke, total, probability_pct: probability });
    }
);

// ─── get_market_pulse ────────────────────────────────────────────────────────
server.registerTool(
    'get_market_pulse',
    {
        title: 'Get a combined market pulse snapshot',
        description:
            'One-shot summary combining the latest TradingView alert with the most recent zones — ' +
            'useful as a starting point before asking more specific follow-up questions.',
        inputSchema: {},
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async () => {
        const [{ data: alerts, error: alertsErr }, { data: zones, error: zonesErr }] = await Promise.all([
            supabase.from('tv_alerts').select('*').order('received_at', { ascending: false }).limit(5),
            supabase.from('zones_history').select('*').order('detected_at', { ascending: false }).limit(5)
        ]);

        if (alertsErr && zonesErr) return toolError(`${alertsErr.message} / ${zonesErr.message}`);

        return json({
            latest_alerts: alertsErr ? { error: alertsErr.message } : alerts,
            latest_zones: zonesErr ? { error: zonesErr.message } : zones
        });
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);
