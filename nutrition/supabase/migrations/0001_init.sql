-- =========================================================================
-- Maicol Nutrition — initial schema
-- =========================================================================
-- Design notes (see DATABASE.md for the full write-up):
--  * Every personal table carries user_id uuid references auth.users(id).
--  * RLS is enabled on every personal table; policies restrict all access
--    to auth.uid() = user_id. Shared/global catalog rows (foods sourced
--    from Open Food Facts/USDA) use user_id IS NULL and are only ever
--    written by server code using the service_role key (which bypasses
--    RLS), never by an authenticated client.
--  * nutrition_goals doubles as its own history: a new goal closes the
--    previous row's effective_to and opens a new one with effective_from.
--  * meal_items stores a full nutrition *snapshot* at log time so editing
--    a food/recipe later never rewrites history (section 52).
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  sex text check (sex in ('male', 'female', 'unspecified')),
  birth_date date,
  height_cm numeric(5,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per user, 1:1 with auth.users.';

-- ---------------------------------------------------------------------
-- user_preferences
-- ---------------------------------------------------------------------
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'es',
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  volume_unit text not null default 'ml' check (volume_unit in ('ml', 'oz')),
  time_format text not null default '24h' check (time_format in ('24h', '12h')),
  start_of_week smallint not null default 1 check (start_of_week between 0 and 6),
  visible_nutrients jsonb not null default '["fiber", "water"]'::jsonb,
  meal_labels jsonb not null default '["Desayuno", "Comida", "Merienda", "Cena", "Otro"]'::jsonb,
  notification_settings jsonb not null default '{
    "weigh_in_reminder": false,
    "incomplete_dinner_reminder": false,
    "weekly_review": true,
    "protein_goal_pending": false
  }'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- nutrition_goals  (also serves as goal_history via effective_from/to)
-- ---------------------------------------------------------------------
create table public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('maintain', 'lose', 'gain')),
  kcal integer not null check (kcal > 0),
  protein_g numeric(6,1) not null check (protein_g >= 0),
  carbohydrates_g numeric(6,1) not null check (carbohydrates_g >= 0),
  fat_g numeric(6,1) not null check (fat_g >= 0),
  fiber_g numeric(6,1),
  water_ml integer,
  weight_target_kg numeric(5,1),
  weekly_rate_min_kg numeric(4,2),
  weekly_rate_max_kg numeric(4,2),
  target_date date,
  source text not null default 'manual' check (source in ('manual', 'onboarding', 'ai_suggestion')),
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now()
);

create index nutrition_goals_user_effective_idx
  on public.nutrition_goals (user_id, effective_from desc);

-- Only one open-ended (effective_to is null) goal per user at a time.
create unique index nutrition_goals_one_open_per_user
  on public.nutrition_goals (user_id)
  where effective_to is null;

-- ---------------------------------------------------------------------
-- weight_entries
-- ---------------------------------------------------------------------
create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  is_usual_conditions boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index weight_entries_user_time_idx
  on public.weight_entries (user_id, measured_at desc);

-- ---------------------------------------------------------------------
-- body_measurements
-- ---------------------------------------------------------------------
create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null,
  measurement_type text not null check (
    measurement_type in ('waist', 'chest', 'arm', 'thigh', 'hip', 'neck', 'custom')
  ),
  custom_label text,
  value_cm numeric(5,1) not null check (value_cm > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index body_measurements_user_time_idx
  on public.body_measurements (user_id, measured_at desc);

-- ---------------------------------------------------------------------
-- progress_photos  (metadata only — files live in the private
-- progress-images storage bucket; never sent to Gemini automatically)
-- ---------------------------------------------------------------------
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  taken_at timestamptz not null,
  category text not null check (category in ('front', 'side', 'back', 'free')),
  storage_path text not null,
  thumbnail_path text,
  notes text,
  created_at timestamptz not null default now()
);

create index progress_photos_user_time_idx
  on public.progress_photos (user_id, taken_at desc);

-- ---------------------------------------------------------------------
-- foods  — the unified, normalized food catalog.
-- user_id null => shared/global catalog entry (OFF, USDA, nutrition
-- label contributed by any user's scan). user_id set => private custom
-- food only its owner can see.
-- ---------------------------------------------------------------------
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  source text not null check (
    source in (
      'nutrition_label', 'open_food_facts', 'usda', 'custom_food',
      'recipe', 'ai_photo_estimation', 'ai_text_estimation', 'manual'
    )
  ),
  barcode text,
  external_id text,
  basis text not null check (basis in ('per_100g', 'per_100ml', 'per_serving')),
  serving_size_g numeric(7,2),
  serving_size_ml numeric(7,2),
  serving_label text,
  energy_kcal numeric(7,2) not null check (energy_kcal >= 0),
  protein_g numeric(6,2) not null default 0 check (protein_g >= 0),
  carbohydrates_g numeric(6,2) not null default 0 check (carbohydrates_g >= 0),
  sugars_g numeric(6,2) check (sugars_g >= 0),
  fat_g numeric(6,2) not null default 0 check (fat_g >= 0),
  saturated_fat_g numeric(6,2) check (saturated_fat_g >= 0),
  fiber_g numeric(6,2) check (fiber_g >= 0),
  sodium_mg numeric(7,2) check (sodium_mg >= 0),
  salt_g numeric(6,2) check (salt_g >= 0),
  micronutrients jsonb not null default '{}'::jsonb,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index foods_barcode_global_idx
  on public.foods (barcode) where user_id is null and barcode is not null;

create extension if not exists pg_trgm;
create index foods_user_idx on public.foods (user_id);
create index foods_name_trgm_idx on public.foods using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  servings numeric(5,2) not null default 1 check (servings > 0),
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid not null references public.foods(id),
  quantity_amount numeric(8,2) not null check (quantity_amount > 0),
  quantity_unit text not null,
  grams_equivalent numeric(8,2) not null check (grams_equivalent > 0),
  position smallint not null default 0
);

create index recipe_items_recipe_idx on public.recipe_items (recipe_id);

-- ---------------------------------------------------------------------
-- meals / meal_items / meal_images
-- ---------------------------------------------------------------------
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null,
  meal_type text not null check (
    meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')
  ),
  name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meals_user_time_idx on public.meals (user_id, occurred_at desc);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid references public.foods(id),
  recipe_id uuid references public.recipes(id),
  name text not null,
  quantity_amount numeric(8,2) not null check (quantity_amount > 0),
  quantity_unit text not null,
  grams_equivalent numeric(8,2),
  -- nutrition snapshot for the *consumed* quantity, frozen at log time
  energy_kcal numeric(8,2) not null check (energy_kcal >= 0),
  protein_g numeric(7,2) not null default 0,
  carbohydrates_g numeric(7,2) not null default 0,
  sugars_g numeric(7,2),
  fat_g numeric(7,2) not null default 0,
  saturated_fat_g numeric(7,2),
  fiber_g numeric(7,2),
  sodium_mg numeric(8,2),
  salt_g numeric(7,2),
  micronutrients jsonb not null default '{}'::jsonb,
  precision_level text not null check (
    precision_level in ('exact', 'calculated', 'estimated', 'unknown')
  ),
  source text not null check (
    source in (
      'nutrition_label', 'open_food_facts', 'usda', 'custom_food',
      'recipe', 'ai_photo_estimation', 'ai_text_estimation',
      'ai_voice_estimation', 'manual'
    )
  ),
  confidence text check (confidence in ('high', 'medium', 'low')),
  range_kcal_min numeric(8,2),
  range_kcal_max numeric(8,2),
  notes text,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index meal_items_meal_idx on public.meal_items (meal_id);
create index meal_items_food_idx on public.meal_items (food_id);

create table public.meal_images (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  angle_label text,
  created_at timestamptz not null default now()
);

create index meal_images_meal_idx on public.meal_images (meal_id);

-- ---------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.foods(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_one_target check (
    (food_id is not null and recipe_id is null) or
    (food_id is null and recipe_id is not null)
  )
);

create unique index favorites_user_food_idx
  on public.favorites (user_id, food_id) where food_id is not null;
create unique index favorites_user_recipe_idx
  on public.favorites (user_id, recipe_id) where recipe_id is not null;

-- ---------------------------------------------------------------------
-- user_food_stats — learns frequency/usual quantity per food (section 20)
-- ---------------------------------------------------------------------
create table public.user_food_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  times_used integer not null default 0,
  last_used_at timestamptz,
  usual_quantity_amount numeric(8,2),
  usual_quantity_unit text,
  updated_at timestamptz not null default now(),
  unique (user_id, food_id)
);

create index user_food_stats_user_freq_idx
  on public.user_food_stats (user_id, times_used desc, last_used_at desc);

-- ---------------------------------------------------------------------
-- day_logs — explicit completeness marker (section 53)
-- ---------------------------------------------------------------------
create table public.day_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  status text not null default 'not_logged' check (
    status in ('complete', 'partial', 'not_logged')
  ),
  note text,
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ---------------------------------------------------------------------
-- training_sessions — optional workout context (section 54)
-- ---------------------------------------------------------------------
create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  session_type text,
  duration_min integer,
  notes text,
  created_at timestamptz not null default now()
);

create index training_sessions_user_date_idx
  on public.training_sessions (user_id, session_date desc);

-- ---------------------------------------------------------------------
-- ai_analyses — raw structured result of an AI capture (section 2, 39)
-- ---------------------------------------------------------------------
create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid references public.meals(id) on delete set null,
  analysis_type text not null check (
    analysis_type in ('photo', 'label', 'text', 'voice', 'barcode')
  ),
  model text not null,
  input_ref text,
  structured_result jsonb not null,
  confidence text check (confidence in ('high', 'medium', 'low')),
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create index ai_analyses_user_time_idx on public.ai_analyses (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- ai_corrections — learning signal (section 39)
-- ---------------------------------------------------------------------
create table public.ai_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_item_id uuid references public.meal_items(id) on delete set null,
  food_name text not null,
  dish_context text,
  original_estimate jsonb not null,
  corrected_value jsonb not null,
  created_at timestamptz not null default now()
);

create index ai_corrections_user_food_idx
  on public.ai_corrections (user_id, food_name);

-- ---------------------------------------------------------------------
-- ai_conversations / ai_messages — COACH IA (section 32-34)
-- ---------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text,
  tool_calls jsonb,
  tool_results jsonb,
  created_at timestamptz not null default now()
);

create index ai_messages_conversation_idx
  on public.ai_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------
-- ai_memory — structured assistant memory (section 34)
-- ---------------------------------------------------------------------
create table public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (
    category in ('preference', 'meal_pattern', 'dislike', 'config', 'goal_context')
  ),
  key text not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, key)
);

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.weight_entries enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.meal_images enable row level security;
alter table public.favorites enable row level security;
alter table public.user_food_stats enable row level security;
alter table public.day_logs enable row level security;
alter table public.training_sessions enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.ai_corrections enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_memory enable row level security;

create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "user_preferences_self" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "nutrition_goals_self" on public.nutrition_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "weight_entries_self" on public.weight_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "body_measurements_self" on public.body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "progress_photos_self" on public.progress_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- foods: everyone can read global (user_id null) rows or their own;
-- writes always require ownership (global rows are inserted by
-- server-side code using the service_role key, which bypasses RLS).
create policy "foods_select" on public.foods
  for select using (user_id is null or auth.uid() = user_id);
create policy "foods_insert_own" on public.foods
  for insert with check (auth.uid() = user_id);
create policy "foods_update_own" on public.foods
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "foods_delete_own" on public.foods
  for delete using (auth.uid() = user_id);

create policy "recipes_self" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recipe_items_via_recipe" on public.recipe_items
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

create policy "meals_self" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "meal_items_via_meal" on public.meal_items
  for all using (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  );

create policy "meal_images_via_meal" on public.meal_images
  for all using (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  );

create policy "favorites_self" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_food_stats_self" on public.user_food_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "day_logs_self" on public.day_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "training_sessions_self" on public.training_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_analyses_self" on public.ai_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_corrections_self" on public.ai_corrections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_conversations_self" on public.ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_messages_via_conversation" on public.ai_messages
  for all using (
    exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );

create policy "ai_memory_self" on public.ai_memory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- Bootstrapping: create profile + preferences + default goal on signup
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger foods_set_updated_at before update on public.foods
  for each row execute function public.set_updated_at();
create trigger recipes_set_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();
create trigger meals_set_updated_at before update on public.meals
  for each row execute function public.set_updated_at();
create trigger ai_conversations_set_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();
