-- =============================================================================
-- Migration: 20260908000007_design.sql
-- Purpose:   Create invitation_designs and invitation_images tables for
--            managing an event's creative invitation assets.
--
--            invitation_designs — zero or one per event (enforced by UNIQUE
--              on event_id). Supports two modes:
--                'images' — ordered gallery of image files in Supabase Storage
--                'html'   — single self-contained HTML file that must pass
--                           both a synchronous structural scan and an
--                           asynchronous malware scan before being served.
--
--            invitation_images — individual image rows for gallery mode.
--              Sort order is explicit (sort_order column) so the organizer
--              can reorder images without renaming files.
--
-- Depends on: 20260908000001_enums.sql
--             20260908000003_events.sql  (events FK)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- invitation_designs
-- At most one per event (UNIQUE on event_id).
-- An event with no row in this table shows guests a default system-branded view.
--
-- html_storage_path    — Supabase Storage path to the uploaded HTML file.
--                        Only set when design_type = 'html'. The file is
--                        stored here only after passing the synchronous
--                        structural scan in the uploadInvitationHtml Edge
--                        Function. Storage RLS denies client writes to this
--                        bucket so the scan cannot be bypassed.
--
-- validation_status    — only meaningful for design_type = 'html'.
--                        'pending'  → malware scan queued, not yet resolved.
--                        'passed'   → both scans cleared; file may be served.
--                        'failed'   → one or both scans failed; never served.
--
-- validation_notes     — plain-language explanation for 'failed' status,
--                        shown to the organizer to guide re-upload.
-- ---------------------------------------------------------------------------
create table invitation_designs (
  id                  uuid                          primary key default gen_random_uuid(),
  event_id            uuid                          not null unique references events (id) on delete cascade,
                                                    -- UNIQUE: at most one design per event (0..1 relationship)
  design_type         design_type_enum              not null,

  -- HTML-mode fields (null when design_type = 'images')
  html_storage_path   text,
  validation_status   design_validation_status_enum,
  validation_notes    text,
  validated_at        timestamptz,

  -- Timestamps
  created_at          timestamptz                   not null default now(),
  updated_at          timestamptz                   not null default now(),

  -- Constraints
  constraint invitation_designs_html_requires_storage_path
    check (design_type <> 'html' or html_storage_path is not null)
);

comment on table  invitation_designs                     is 'Creative invitation asset for an event. At most one per event. Either an image gallery or a validated self-contained HTML file.';
comment on column invitation_designs.html_storage_path  is 'Supabase Storage path. Only set for design_type = html, and only after passing the synchronous structural scan.';
comment on column invitation_designs.validation_status  is 'Only meaningful for html designs. passed = both scans cleared; failed = never served to guests.';
comment on column invitation_designs.validation_notes   is 'Plain-language failure message shown to the organizer when validation_status = failed.';

create trigger trg_invitation_designs_updated_at
  before update on invitation_designs
  for each row execute function set_updated_at();

-- No additional index needed: event_id UNIQUE constraint already creates one.

-- Row Level Security
alter table invitation_designs enable row level security;

-- Organizers may fully manage their event's design.
create policy "invitation_designs: organizer manages own event"
  on invitation_designs for all
  using (
    exists (
      select 1 from events e
      where e.id = invitation_designs.event_id
        and e.organizer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from events e
      where e.id = invitation_designs.event_id
        and e.organizer_id = auth.uid()
    )
  );

-- Guests may read the design for events they are invited to,
-- but ONLY if validation_status = 'passed' (or design_type = 'images').
-- A failed or pending HTML design is never visible to guests.
create policy "invitation_designs: guest reads passed design for invited event"
  on invitation_designs for select
  using (
    (design_type = 'images' or validation_status = 'passed')
    and exists (
      select 1
      from invitations i
      join guests g on g.id = i.guest_id
      where i.event_id = invitation_designs.event_id
        and g.auth_user_id = auth.uid()
    )
  );

-- Check-in staff do NOT have access to invitation designs — by design (§6).
-- No staff SELECT policy is created here.


-- ---------------------------------------------------------------------------
-- invitation_images
-- Individual image rows for gallery-mode invitation designs.
-- Each row references the event directly (not via invitation_designs) for
-- simpler queries and cascade deletion when the event is removed.
-- sort_order is explicit so the organizer can reorder without renaming files.
-- ---------------------------------------------------------------------------
create table invitation_images (
  id            uuid        primary key default gen_random_uuid(),
  event_id      uuid        not null references events (id) on delete cascade,
  storage_path  text        not null,    -- Supabase Storage path to the image file
  sort_order    int         not null,    -- gallery display order (ascending); organizer-controlled
  caption       text,                   -- optional alt text / caption shown in the lightbox
  created_at    timestamptz not null default now(),

  -- Prevent duplicate sort_order within the same event
  constraint invitation_images_unique_sort_order unique (event_id, sort_order)
);

comment on table  invitation_images              is 'One image per row in a gallery-mode invitation design. sort_order controls display sequence.';
comment on column invitation_images.storage_path is 'Supabase Storage path. JPG/PNG/WebP, max 5 MB per file (enforced at upload time by the client and Storage rules).';
comment on column invitation_images.sort_order   is 'Ascending display order in the lightbox gallery. Organizer can reorder by updating this column.';

-- Index for gallery query (ordered by sort_order per event)
create index idx_invitation_images_event_sort on invitation_images (event_id, sort_order);

-- Row Level Security
alter table invitation_images enable row level security;

-- Organizers may fully manage images for their events.
create policy "invitation_images: organizer manages own event"
  on invitation_images for all
  using (
    exists (
      select 1 from events e
      where e.id = invitation_images.event_id
        and e.organizer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from events e
      where e.id = invitation_images.event_id
        and e.organizer_id = auth.uid()
    )
  );

-- Guests may read images for events they are invited to.
create policy "invitation_images: guest reads for invited event"
  on invitation_images for select
  using (
    exists (
      select 1
      from invitations i
      join guests g on g.id = i.guest_id
      where i.event_id = invitation_images.event_id
        and g.auth_user_id = auth.uid()
    )
  );

-- Public: open-registration events show images to unauthenticated visitors
-- (so the landing page at /register/:slug can display the gallery).
create policy "invitation_images: public reads for open registration published event"
  on invitation_images for select
  using (
    exists (
      select 1 from events e
      where e.id = invitation_images.event_id
        and e.visibility_mode = 'open_registration'
        and e.status = 'published'
        and e.deleted_at is null
    )
  );
