-- Supabase-specific setup that Drizzle's schema cannot express:
-- 1. profiles row per auth user (trigger)
-- 2. storage buckets + host read policy on storage.objects
-- 3. privilege hardening for the public PostgREST roles

-- 1. Create a profile whenever a user signs up (Google metadata is read defensively).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;--> statement-breakpoint

drop trigger if exists on_auth_user_created on auth.users;--> statement-breakpoint
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();--> statement-breakpoint

-- 2. Storage buckets. Objects are addressed as {eventId}/{photoId}.jpg (and /thumbs/).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-assets', 'event-assets', true,  5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('event-photos', 'event-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;--> statement-breakpoint

-- Hosts may read objects under their own events' folders (defense in depth; the app
-- serves photos through server-minted signed URLs). No write policies: uploads use
-- signed upload URLs and deletes use the secret key.
drop policy if exists "hosts read own event objects" on storage.objects;--> statement-breakpoint
create policy "hosts read own event objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id in ('event-assets', 'event-photos')
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and ((storage.foldername(name))[1])::uuid in (
      select id from public.events where host_id = (select auth.uid())
    )
  );--> statement-breakpoint

-- 3. The anonymous PostgREST role never needs any of our tables (guests are served by
-- the Next.js server). Revoke now and for tables created by later migrations.
revoke all on all tables in schema public from anon;--> statement-breakpoint
revoke all on all sequences in schema public from anon;--> statement-breakpoint
alter default privileges for role postgres in schema public revoke all on tables from anon;--> statement-breakpoint
alter default privileges for role postgres in schema public revoke all on sequences from anon;--> statement-breakpoint
-- rate_limits is internal: not even authenticated hosts may read it.
revoke all on table public.rate_limits from authenticated;
