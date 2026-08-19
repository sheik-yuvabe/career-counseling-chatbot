-- Private buckets used by the Module 4 server-side report renderer.
-- The service role uploads assets; browser clients never receive that key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('private-reports', 'private-reports', false, 10485760, array['application/pdf']),
  ('share-cards', 'share-cards', false, 2097152, array['image/svg+xml'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
