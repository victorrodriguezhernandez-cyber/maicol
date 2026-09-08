-- Private storage buckets. Objects are namespaced by <user_id>/... and the
-- RLS policies below only let a user read/write inside their own folder.
-- Nothing here is public; the app must use signed URLs to display images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('meal-images', 'meal-images', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic']),
  ('progress-images', 'progress-images', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic']),
  ('optional-documents', 'optional-documents', false, 15728640, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy "meal_images_owner_rw" on storage.objects
  for all using (bucket_id = 'meal-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'meal-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "progress_images_owner_rw" on storage.objects
  for all using (bucket_id = 'progress-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'progress-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "optional_documents_owner_rw" on storage.objects
  for all using (bucket_id = 'optional-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'optional-documents' and (storage.foldername(name))[1] = auth.uid()::text);
