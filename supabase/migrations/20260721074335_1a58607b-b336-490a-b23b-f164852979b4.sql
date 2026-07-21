
create extension if not exists vector;

create type public.app_role as enum ('owner', 'admin', 'recruiter', 'viewer');
create type public.plan_tier as enum ('free', 'starter', 'growth', 'scale');
create type public.job_status as enum ('open', 'closed', 'archived');
create type public.pipeline_stage as enum ('queued', 'extracting', 'scoring', 'explaining', 'complete', 'failed');
create type public.confidence_level as enum ('high', 'medium', 'low');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan public.plan_tier not null default 'free',
  stripe_customer_id text unique,
  monthly_candidate_quota int not null default 20,
  candidates_used_this_period int not null default 0,
  period_started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create index idx_profiles_org on public.profiles(organization_id) where deleted_at is null;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, organization_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create index idx_user_roles_lookup on public.user_roles(user_id, organization_id);

create or replace function public.has_role(_user_id uuid, _org_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and organization_id = _org_id and role = _role)
$$;

create or replace function public.current_user_org()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid() and deleted_at is null limit 1
$$;

create or replace function public.is_org_member(_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and organization_id = _org_id and deleted_at is null)
$$;

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

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create policy "org members view their org" on public.organizations for select to authenticated using (public.is_org_member(id));
create policy "owners update their org" on public.organizations for update to authenticated
  using (public.has_role(auth.uid(), id, 'owner')) with check (public.has_role(auth.uid(), id, 'owner'));

create policy "org members view org profiles" on public.profiles for select to authenticated using (organization_id = public.current_user_org());
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "users view own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), organization_id, 'owner') or public.has_role(auth.uid(), organization_id, 'admin'));

create table public.job_requisitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null,
  raw_jd_text text not null,
  extracted_requirements jsonb not null default '{}'::jsonb,
  status public.job_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update, delete on public.job_requisitions to authenticated;
grant all on public.job_requisitions to service_role;
alter table public.job_requisitions enable row level security;
create index idx_jobs_org on public.job_requisitions(organization_id) where deleted_at is null;

create policy "org members view jobs" on public.job_requisitions for select to authenticated
  using (organization_id = public.current_user_org() and deleted_at is null);
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

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_requisition_id uuid not null references public.job_requisitions(id) on delete cascade,
  uploaded_by uuid references auth.users(id),
  candidate_name text,
  candidate_email text,
  resume_storage_path text not null,
  raw_resume_text text,
  parsed_profile jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select, insert, update, delete on public.candidates to authenticated;
grant all on public.candidates to service_role;
alter table public.candidates enable row level security;
create index idx_candidates_job_req on public.candidates(job_requisition_id) where deleted_at is null;
create index idx_candidates_org on public.candidates(organization_id) where deleted_at is null;

create policy "org members view candidates" on public.candidates for select to authenticated
  using (organization_id = public.current_user_org() and deleted_at is null);
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

create table public.match_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_requisition_id uuid not null references public.job_requisitions(id) on delete cascade,
  pipeline_run_id uuid,
  overall_score numeric(5,2) not null,
  overall_confidence public.confidence_level not null default 'medium',
  requirement_breakdown jsonb not null,
  summary_text text not null,
  model_version text not null,
  gated_by_must_have boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.match_evaluations to authenticated;
grant all on public.match_evaluations to service_role;
alter table public.match_evaluations enable row level security;
create index idx_match_candidate on public.match_evaluations(candidate_id);
create index idx_match_job on public.match_evaluations(job_requisition_id);

create policy "org members view matches" on public.match_evaluations for select to authenticated
  using (organization_id = public.current_user_org());
create policy "recruiters insert matches" on public.match_evaluations for insert to authenticated
  with check (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner')
      or public.has_role(auth.uid(), organization_id, 'admin')
      or public.has_role(auth.uid(), organization_id, 'recruiter')));

create table public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_requisition_id uuid not null references public.job_requisitions(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete cascade,
  status public.pipeline_stage not null default 'queued',
  current_stage text,
  progress int not null default 0,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.pipeline_runs to authenticated;
grant all on public.pipeline_runs to service_role;
alter table public.pipeline_runs enable row level security;
create index idx_pipeline_status on public.pipeline_runs(status) where status not in ('complete', 'failed');
create index idx_pipeline_org on public.pipeline_runs(organization_id, created_at desc);

create policy "org members view pipeline runs" on public.pipeline_runs for select to authenticated
  using (organization_id = public.current_user_org());

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create index idx_audit_org on public.audit_logs(organization_id, created_at desc);

create policy "admins view audit logs" on public.audit_logs for select to authenticated
  using (organization_id = public.current_user_org()
    and (public.has_role(auth.uid(), organization_id, 'owner')
      or public.has_role(auth.uid(), organization_id, 'admin')));
create policy "org members insert audit logs" on public.audit_logs for insert to authenticated
  with check (organization_id = public.current_user_org() and actor_user_id = auth.uid());

create table public.resume_embeddings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  chunk_index int not null default 0,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.resume_embeddings to authenticated;
grant all on public.resume_embeddings to service_role;
alter table public.resume_embeddings enable row level security;
create index resume_embeddings_hnsw on public.resume_embeddings using hnsw (embedding vector_cosine_ops);
create index idx_embeddings_candidate on public.resume_embeddings(candidate_id);

create policy "org members view embeddings" on public.resume_embeddings for select to authenticated
  using (organization_id = public.current_user_org());

create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger touch_profiles_updated before update on public.profiles
  for each row execute function public.tg_touch_updated_at();
create trigger touch_jobs_updated before update on public.job_requisitions
  for each row execute function public.tg_touch_updated_at();

-- Storage policies on the "resumes" bucket (bucket already created)
create policy "org members read resumes" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = public.current_user_org()::text);
create policy "org members upload resumes" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = public.current_user_org()::text);
create policy "org members delete resumes" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = public.current_user_org()::text);
