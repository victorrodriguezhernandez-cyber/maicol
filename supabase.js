// SENSEI ZONES — Supabase client & DB functions
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://pyiukqeuaxonsrrgbfzq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MvaYVraw3FqViy9G4nhKSQ_QbFpMudx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Save a newly detected zone to history
export async function saveZone(zone) {
    const { data, error } = await supabase
        .from('zones_history')
        .insert([{
            asset: 'BTCUSDT',
            timeframe: '15m',
            zone_type: zone.type,
            zone_top: zone.top,
            zone_bottom: zone.bottom,
            zone_height: zone.top - zone.bottom,
            atr_value: zone.atr,
            trend_context: zone.trend,
            is_virgin: zone.isVirgin,
            result: 'pending',
            confluence_score: zone.confluenceScore || 0
        }])
        .select()
        .single();

    if (error) {
        console.warn('[Supabase] saveZone error:', error.message);
        return null;
    }
    return data;
}

// Find historically similar zones and calculate probability
export async function getSimilarZones(zone) {
    const heightRatioMin = zone.height * 0.8;
    const heightRatioMax = zone.height * 1.2;

    const { data, error } = await supabase
        .from('zones_history')
        .select('result, is_virgin')
        .eq('zone_type', zone.type)
        .eq('trend_context', zone.trend)
        .gte('zone_height', heightRatioMin)
        .lte('zone_height', heightRatioMax)
        .neq('result', 'pending')
        .order('detected_at', { ascending: false })
        .limit(100);

    if (error || !data || data.length === 0) {
        return { respected: 0, broke: 0, total: 0, probability: null };
    }

    const respected = data.filter(r => r.result === 'respected').length;
    const broke = data.filter(r => r.result === 'broke').length;
    const total = respected + broke;
    const probability = total > 0 ? Math.round((respected / total) * 100) : null;

    return { respected, broke, total, probability };
}

// Update a zone's result once price confirms
export async function updateZoneResult(id, result) {
    const { error } = await supabase
        .from('zones_history')
        .update({ result, result_at: new Date().toISOString() })
        .eq('id', id);

    if (error) console.warn('[Supabase] updateZoneResult error:', error.message);
}

// Get the most recent zones for the sidebar
export async function getRecentZones(limit = 5) {
    const { data, error } = await supabase
        .from('zones_history')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.warn('[Supabase] getRecentZones error:', error.message);
        return [];
    }
    return data || [];
}

// Mark a zone as no longer virgin (price touched it)
export async function markZoneTouched(id) {
    const { error } = await supabase
        .from('zones_history')
        .update({ is_virgin: false })
        .eq('id', id);

    if (error) console.warn('[Supabase] markZoneTouched error:', error.message);
}
