-- ══════════════════════════════════════════════════════════════════════════
--  TV_ALERTS — stores incoming TradingView alert webhooks
--  Run this once in the Supabase SQL editor (Project → SQL Editor → New query)
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists tv_alerts (
    id           bigint generated always as identity primary key,
    received_at  timestamptz not null default now(),
    ticker       text,
    timeframe    text,
    alert_name   text,
    action       text,          -- e.g. "buy" / "sell" / "bos_bull" / "bos_bear"
    price        numeric,
    message      text,          -- raw alert message text from TradingView
    raw          jsonb          -- full original payload, for anything not modeled above
);

create index if not exists tv_alerts_received_at_idx
    on tv_alerts (received_at desc);

create index if not exists tv_alerts_ticker_idx
    on tv_alerts (ticker);

-- Row Level Security: allow public read (same trust model as zones_history,
-- which this project already exposes via the anon/publishable key), but
-- never allow anon inserts — only the webhook (using the service_role key,
-- which bypasses RLS) may write.
alter table tv_alerts enable row level security;

drop policy if exists "Allow public read" on tv_alerts;
create policy "Allow public read"
    on tv_alerts for select
    using (true);
