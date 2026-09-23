-- Recreate enum types
create type public.app_role as enum ('owner', 'admin', 'recruiter', 'viewer');
create type public.plan_tier as enum ('free', 'starter', 'growth', 'scale');
create type public.job_status as enum ('open', 'closed', 'archived');
create type public.pipeline_stage as enum ('queued', 'extracting', 'scoring', 'explaining', 'complete', 'failed');
create type public.confidence_level as enum ('high', 'medium', 'low');

-- Restore enum-typed columns
alter table public.organizations add column if not exists plan public.plan_tier not null default 'free';
alter table public.job_requisitions add column if not exists status public.job_status not null default 'open';
alter table public.pipeline_runs add column if not exists status public.pipeline_stage not null default 'queued';
alter table public.match_evaluations add column if not exists overall_confidence public.confidence_level not null default 'medium';
alter table public.user_roles add column if not exists role public.app_role not null default 'owner';
alter table public.user_roles drop constraint if exists user_roles_user_id_organization_id_role_key;
alter table public.user_roles add constraint user_roles_user_id_organization_id_role_key unique (user_id, organization_id, role);
create index if not exists idx_pipeline_status on public.pipeline_runs(status) where status not in ('complete', 'failed');

-- Restore role helper
create or replace function public.has_role(_user_id uuid, _org_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and organization_id = _org_id and role = _role)
$$;
revoke execute on function public.has_role(uuid, uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, uuid, public.app_role) to authenticated;

-- Restore policies that were dropped with the role type
create policy "owners update their org" on public.organizations for update to authenticated
  using (public.has_role(auth.uid(), id, 'owner')) with check (public.has_role(auth.uid(), id, 'owner'));

create policy "users view own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), organization_id, 'owner') or public.has_role(auth.uid(), organization_id, 'admin'));
create policy "admins manage user roles insert" on public.user_roles for insert to authenticated
  with check (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner') or public.has_role(auth.uid(), organization_id, 'admin')));
create policy "admins manage user roles update" on public.user_roles for update to authenticated
  using (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner') or public.has_role(auth.uid(), organization_id, 'admin')));
create policy "admins manage user roles delete" on public.user_roles for delete to authenticated
  using (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner') or public.has_role(auth.uid(), organization_id, 'admin')));

create policy "recruiters insert jobs" on public.job_requisitions for insert to authenticated
  with check (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner')
      or public.has_role(auth.uid(), organization_id, 'admin')
      or public.has_role(auth.uid(), organization_id, 'recruiter')));
create policy "recruiters update jobs" on public.job_requisitions for update to authenticated
  using (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner')
      or public.has_role(auth.uid(), organization_id, 'admin')
      or public.has_role(auth.uid(), organization_id, 'recruiter')));
create policy "admins delete jobs" on public.job_requisitions for delete to authenticated
  using (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner')
      or public.has_role(auth.uid(), organization_id, 'admin')));

create policy "recruiters insert candidates" on public.candidates for insert to authenticated
  with check (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner')
      or public.has_role(auth.uid(), organization_id, 'admin')
      or public.has_role(auth.uid(), organization_id, 'recruiter')));
create policy "recruiters update candidates" on public.candidates for update to authenticated
  using (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner')
      or public.has_role(auth.uid(), organization_id, 'admin')
      or public.has_role(auth.uid(), organization_id, 'recruiter')));
create policy "admins delete candidates" on public.candidates for delete to authenticated
  using (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner')
      or public.has_role(auth.uid(), organization_id, 'admin')));

create policy "recruiters insert matches" on public.match_evaluations for insert to authenticated
  with check (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner')
      or public.has_role(auth.uid(), organization_id, 'admin')
      or public.has_role(auth.uid(), organization_id, 'recruiter')));

create policy "admins view audit logs" on public.audit_logs for select to authenticated
  using (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner')
      or public.has_role(auth.uid(), organization_id, 'admin')));

create policy "recruiters insert embeddings" on public.resume_embeddings for insert to authenticated
  with check (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner')
      or public.has_role(auth.uid(), organization_id, 'admin')
      or public.has_role(auth.uid(), organization_id, 'recruiter')));

create policy "voice_screens_delete_admin" on public.voice_screens for delete to authenticated
  using (public.has_role(auth.uid(), organization_id, 'owner')
    or public.has_role(auth.uid(), organization_id, 'admin')
    or created_by = auth.uid());

create policy "ats_conn_select_admin" on public.ats_connections for select to authenticated
  using (public.has_role(auth.uid(), organization_id, 'owner') or public.has_role(auth.uid(), organization_id, 'admin'));
create policy "ats_conn_insert_admin" on public.ats_connections for insert to authenticated
  with check ((public.has_role(auth.uid(), organization_id, 'owner') or public.has_role(auth.uid(), organization_id, 'admin')) and created_by = auth.uid());
create policy "ats_conn_update_admin" on public.ats_connections for update to authenticated
  using (public.has_role(auth.uid(), organization_id, 'owner') or public.has_role(auth.uid(), organization_id, 'admin'))
  with check (public.has_role(auth.uid(), organization_id, 'owner') or public.has_role(auth.uid(), organization_id, 'admin'));
create policy "ats_conn_delete_admin" on public.ats_connections for delete to authenticated
  using (public.has_role(auth.uid(), organization_id, 'owner') or public.has_role(auth.uid(), organization_id, 'admin'));

create policy "ats_imports_insert_admin" on public.ats_imports for insert to authenticated
  with check (public.has_role(auth.uid(), organization_id, 'owner') or public.has_role(auth.uid(), organization_id, 'admin'));

-- Recreate the signup trigger function (it was rebuilt with the role type)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_org_id uuid; org_name text;
begin
  org_name := coalesce(new.raw_user_meta_data->>'organization_name', split_part(new.email, '@', 1) || '''s workspace');
  insert into public.organizations (name) values (org_name) returning id into new_org_id;
  insert into public.profiles (id, organization_id, email, full_name, avatar_url)
  values (new.id, new_org_id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, organization_id, role) values (new.id, new_org_id, 'owner');
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
revoke execute on function public.handle_new_user() from public;