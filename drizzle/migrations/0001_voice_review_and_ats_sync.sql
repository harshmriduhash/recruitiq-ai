-- Voice screen review + ATS mapping
alter table public.voice_screens
  add column if not exists review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed','reviewed')),
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists recruiter_notes text,
  add column if not exists ats_synced_at timestamptz,
  add column if not exists ats_external_note_id text,
  add column if not exists ats_sync_error text;

-- ATS import sync bookkeeping
alter table public.ats_imports
  add column if not exists last_synced_at timestamptz,
  add column if not exists external_stage text;

grant update on public.ats_imports to authenticated;

drop policy if exists "ats_imports_update_org" on public.ats_imports;
create policy "ats_imports_update_org" on public.ats_imports for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create index if not exists ats_imports_candidate_idx on public.ats_imports(candidate_id);