-- HTML objects are private. The upload function writes using the service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invitation-html', 'invitation-html', false, 2097152, array['text/html']);

alter table public.invitation_designs add column scan_id uuid unique;
comment on column public.invitation_designs.scan_id is
  'Per-upload job identifier supplied to the scanner. Apply a verdict only to the matching pending job.';

-- Preserve organizer reads and image-gallery writes. Only the service role
-- can create or approve an HTML design, even through direct PostgREST calls.
drop policy "invitation_designs: organizer manages own event" on public.invitation_designs;
create policy "organizer reads own design" on public.invitation_designs for select
  using (public.is_event_organizer(event_id));
create policy "organizer creates gallery" on public.invitation_designs for insert
  with check (public.is_event_organizer(event_id) and design_type = 'images' and scan_id is null and html_storage_path is null);
create policy "organizer updates gallery" on public.invitation_designs for update
  using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id) and design_type = 'images' and scan_id is null and html_storage_path is null);
create policy "organizer deletes own design" on public.invitation_designs for delete
  using (public.is_event_organizer(event_id));
