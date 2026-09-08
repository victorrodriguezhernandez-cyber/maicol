-- Performance-advisor fix: wrap auth.uid() as (select auth.uid()) in every
-- RLS policy so Postgres evaluates it once per query instead of once per
-- row (auth_rls_initplan lint). Pure performance change — the access
-- rules themselves are unchanged. See DATABASE.md / CLAUDE.md.

drop policy "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy "user_preferences_self" on public.user_preferences;
create policy "user_preferences_self" on public.user_preferences
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "nutrition_goals_self" on public.nutrition_goals;
create policy "nutrition_goals_self" on public.nutrition_goals
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "weight_entries_self" on public.weight_entries;
create policy "weight_entries_self" on public.weight_entries
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "body_measurements_self" on public.body_measurements;
create policy "body_measurements_self" on public.body_measurements
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "progress_photos_self" on public.progress_photos;
create policy "progress_photos_self" on public.progress_photos
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "foods_select" on public.foods;
create policy "foods_select" on public.foods
  for select using (user_id is null or (select auth.uid()) = user_id);
drop policy "foods_insert_own" on public.foods;
create policy "foods_insert_own" on public.foods
  for insert with check ((select auth.uid()) = user_id);
drop policy "foods_update_own" on public.foods;
create policy "foods_update_own" on public.foods
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy "foods_delete_own" on public.foods;
create policy "foods_delete_own" on public.foods
  for delete using ((select auth.uid()) = user_id);

drop policy "recipes_self" on public.recipes;
create policy "recipes_self" on public.recipes
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "recipe_items_via_recipe" on public.recipe_items;
create policy "recipe_items_via_recipe" on public.recipe_items
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid()))
  );

drop policy "meals_self" on public.meals;
create policy "meals_self" on public.meals
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "meal_items_via_meal" on public.meal_items;
create policy "meal_items_via_meal" on public.meal_items
  for all using (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid()))
  );

drop policy "meal_images_via_meal" on public.meal_images;
create policy "meal_images_via_meal" on public.meal_images
  for all using (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid()))
  );

drop policy "favorites_self" on public.favorites;
create policy "favorites_self" on public.favorites
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "user_food_stats_self" on public.user_food_stats;
create policy "user_food_stats_self" on public.user_food_stats
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "day_logs_self" on public.day_logs;
create policy "day_logs_self" on public.day_logs
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "training_sessions_self" on public.training_sessions;
create policy "training_sessions_self" on public.training_sessions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "ai_analyses_self" on public.ai_analyses;
create policy "ai_analyses_self" on public.ai_analyses
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "ai_corrections_self" on public.ai_corrections;
create policy "ai_corrections_self" on public.ai_corrections
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "ai_conversations_self" on public.ai_conversations;
create policy "ai_conversations_self" on public.ai_conversations
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "ai_messages_via_conversation" on public.ai_messages;
create policy "ai_messages_via_conversation" on public.ai_messages
  for all using (
    exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
  );

drop policy "ai_memory_self" on public.ai_memory;
create policy "ai_memory_self" on public.ai_memory
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Performance-advisor fix: covering indexes for foreign keys used in joins
-- and RLS subqueries (unindexed_foreign_keys lint).
create index ai_analyses_meal_id_idx on public.ai_analyses (meal_id);
create index ai_conversations_user_id_idx on public.ai_conversations (user_id);
create index ai_corrections_meal_item_id_idx on public.ai_corrections (meal_item_id);
create index favorites_food_id_idx on public.favorites (food_id);
create index favorites_recipe_id_idx on public.favorites (recipe_id);
create index meal_items_recipe_id_idx on public.meal_items (recipe_id);
create index recipe_items_food_id_idx on public.recipe_items (food_id);
create index recipes_user_id_idx on public.recipes (user_id);
create index user_food_stats_food_id_idx on public.user_food_stats (food_id);
