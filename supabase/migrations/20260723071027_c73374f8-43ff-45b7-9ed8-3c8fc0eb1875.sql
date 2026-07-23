
CREATE TABLE public.voice_screens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_requisition_id uuid NOT NULL REFERENCES public.job_requisitions(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','recording','transcribing','summarizing','complete','failed')),
  recording_storage_path text,
  duration_seconds integer,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  transcript_text text,
  summary text,
  structured_notes jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX voice_screens_candidate_idx ON public.voice_screens(candidate_id) WHERE deleted_at IS NULL;
CREATE INDEX voice_screens_org_idx ON public.voice_screens(organization_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_screens TO authenticated;
GRANT ALL ON public.voice_screens TO service_role;
ALTER TABLE public.voice_screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_screens_select_org" ON public.voice_screens FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "voice_screens_insert_org" ON public.voice_screens FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY "voice_screens_update_org" ON public.voice_screens FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "voice_screens_delete_admin" ON public.voice_screens FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), organization_id, 'owner')
    OR public.has_role(auth.uid(), organization_id, 'admin')
    OR created_by = auth.uid()
  );

CREATE TRIGGER voice_screens_updated_at BEFORE UPDATE ON public.voice_screens
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.ats_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('greenhouse','lever','ashby')),
  display_name text NOT NULL,
  api_key text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','error','disabled')),
  last_sync_at timestamptz,
  last_error text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (organization_id, provider, display_name)
);
CREATE INDEX ats_connections_org_idx ON public.ats_connections(organization_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ats_connections TO authenticated;
GRANT ALL ON public.ats_connections TO service_role;
ALTER TABLE public.ats_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ats_conn_select_admin" ON public.ats_connections FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), organization_id, 'owner')
    OR public.has_role(auth.uid(), organization_id, 'admin')
  );
CREATE POLICY "ats_conn_insert_admin" ON public.ats_connections FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), organization_id, 'owner')
      OR public.has_role(auth.uid(), organization_id, 'admin'))
    AND created_by = auth.uid()
  );
CREATE POLICY "ats_conn_update_admin" ON public.ats_connections FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), organization_id, 'owner')
    OR public.has_role(auth.uid(), organization_id, 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), organization_id, 'owner')
    OR public.has_role(auth.uid(), organization_id, 'admin')
  );
CREATE POLICY "ats_conn_delete_admin" ON public.ats_connections FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), organization_id, 'owner')
    OR public.has_role(auth.uid(), organization_id, 'admin')
  );

CREATE TRIGGER ats_conn_updated_at BEFORE UPDATE ON public.ats_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.ats_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.ats_connections(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_job_id text,
  external_candidate_id text NOT NULL,
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  job_requisition_id uuid REFERENCES public.job_requisitions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'imported' CHECK (status IN ('imported','skipped','failed')),
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, external_candidate_id)
);
CREATE INDEX ats_imports_org_idx ON public.ats_imports(organization_id);

GRANT SELECT, INSERT ON public.ats_imports TO authenticated;
GRANT ALL ON public.ats_imports TO service_role;
ALTER TABLE public.ats_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ats_imports_select_org" ON public.ats_imports FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "ats_imports_insert_admin" ON public.ats_imports FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), organization_id, 'owner')
    OR public.has_role(auth.uid(), organization_id, 'admin')
  );

-- Storage RLS for voice-recordings bucket (org scoped by path prefix)
CREATE POLICY "voice_recordings_select_org" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-recordings'
    AND public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "voice_recordings_insert_org" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-recordings'
    AND public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "voice_recordings_delete_org" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'voice-recordings'
    AND public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
