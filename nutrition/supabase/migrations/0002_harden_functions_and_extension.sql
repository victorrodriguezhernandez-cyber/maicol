-- Fix advisor findings for objects created by 0001_init.sql.
-- (Pre-existing findings on zonas_historial/niveles_historial/analisis_actual
-- belong to the unrelated trading app that shares this Supabase project and
-- are intentionally left untouched.)

alter extension pg_trgm set schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

revoke execute on function public.handle_new_user() from public, anon, authenticated;
