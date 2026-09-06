// ══════════════════════════════════════════════════════════════════════════
//  /api/tradingview-webhook
//
//  Receives alert webhooks fired by TradingView (from the alertcondition()
//  blocks in el_sensei_espanol.pine, or any other TradingView alert) and
//  stores them in the `tv_alerts` Supabase table (see sql/tv_alerts.sql).
//
//  The MCP server in mcp-server/ reads from that table so Claude can see
//  TradingView alerts as they arrive.
//
//  Configure in TradingView:
//    Alert → Notifications → Webhook URL:
//      https://<your-vercel-domain>/api/tradingview-webhook?secret=<TV_WEBHOOK_SECRET>
//    Message (JSON, supports TradingView placeholders):
//      {
//        "ticker": "{{ticker}}",
//        "timeframe": "{{interval}}",
//        "alert_name": "BOS Alcista",
//        "action": "bos_bull",
//        "price": {{close}},
//        "message": "{{strategy.order.comment}}"
//      }
//
//  Required environment variables (set in Vercel project settings):
//    SUPABASE_URL               — same project as supabase.js
//    SUPABASE_SERVICE_ROLE_KEY  — service_role key (Project Settings → API).
//                                  NEVER use the publishable/anon key here:
//                                  this endpoint needs write access and must
//                                  bypass the read-only RLS policy.
//    TV_WEBHOOK_SECRET          — optional, but strongly recommended. TradingView
//                                  webhooks are unauthenticated by default, so
//                                  this shared secret keeps randoms off the internet
//                                  from writing fake alerts into your table.
// ══════════════════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars');
    }
    return createClient(url, key);
}

// TradingView sends either plain text or JSON, and always as a raw string
// body — Vercel's body parser only kicks in for a matching Content-Type, so
// handle both.
function parseBody(req) {
    const raw = req.body;
    if (raw == null) return { message: '' };
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return { message: String(raw) };
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed, use POST' });
        return;
    }

    const expectedSecret = process.env.TV_WEBHOOK_SECRET;
    if (expectedSecret && req.query.secret !== expectedSecret) {
        res.status(401).json({ error: 'Invalid or missing secret' });
        return;
    }

    let payload;
    try {
        payload = parseBody(req);
    } catch (err) {
        res.status(400).json({ error: `Malformed body: ${err.message}` });
        return;
    }

    const row = {
        ticker: payload.ticker ?? null,
        timeframe: payload.timeframe ?? payload.interval ?? null,
        alert_name: payload.alert_name ?? payload.title ?? null,
        action: payload.action ?? null,
        price: payload.price != null ? Number(payload.price) : null,
        message: payload.message ?? (typeof payload === 'string' ? payload : JSON.stringify(payload)),
        raw: payload
    };

    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('tv_alerts')
            .insert([row])
            .select()
            .single();

        if (error) {
            console.error('[tradingview-webhook] insert error:', error.message);
            res.status(500).json({ error: error.message });
            return;
        }

        res.status(200).json({ ok: true, id: data.id });
    } catch (err) {
        console.error('[tradingview-webhook] fatal error:', err.message);
        res.status(500).json({ error: err.message });
    }
};
