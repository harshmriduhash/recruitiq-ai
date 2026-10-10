CREATE TABLE public.api_rate_limits (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, bucket, window_start)
);
GRANT SELECT ON public.api_rate_limits TO authenticated;
GRANT ALL ON public.api_rate_limits TO service_role;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY rate_limits_select_org ON public.api_rate_limits FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE OR REPLACE FUNCTION public.check_rate_limit(_bucket text, _window_seconds integer DEFAULT 60)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _org uuid := public.current_user_org();
  _plan plan_tier;
  _limit integer;
  _win timestamptz;
  _count integer;
BEGIN
  IF _org IS NULL THEN RETURN jsonb_build_object('allowed', false, 'reason', 'no_org'); END IF;
  SELECT plan INTO _plan FROM organizations WHERE id = _org;
  _limit := CASE _plan WHEN 'free' THEN 20 WHEN 'starter' THEN 60 WHEN 'growth' THEN 180 ELSE 600 END;
  _win := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  INSERT INTO api_rate_limits(organization_id, bucket, window_start, request_count)
  VALUES (_org, _bucket, _win, 1)
  ON CONFLICT (organization_id, bucket, window_start) DO UPDATE SET request_count = api_rate_limits.request_count + 1
  RETURNING request_count INTO _count;
  DELETE FROM api_rate_limits WHERE organization_id = _org AND window_start < now() - interval '1 day';
  RETURN jsonb_build_object('allowed', _count <= _limit, 'limit', _limit, 'count', _count, 'plan', _plan);
END $$;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer) TO authenticated;

ALTER TABLE public.job_requisitions ADD COLUMN IF NOT EXISTS requirements_embedding vector(1536);

CREATE OR REPLACE FUNCTION public.match_similar_jobs(_embedding vector(1536), _exclude uuid DEFAULT NULL, _limit integer DEFAULT 3)
RETURNS TABLE(id uuid, title text, created_at timestamptz, extracted_requirements jsonb, similarity double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT j.id, j.title, j.created_at, j.extracted_requirements, 1 - (j.requirements_embedding <=> _embedding)
  FROM job_requisitions j
  WHERE j.deleted_at IS NULL AND j.requirements_embedding IS NOT NULL
    AND j.organization_id = public.current_user_org()
    AND (_exclude IS NULL OR j.id <> _exclude)
  ORDER BY j.requirements_embedding <=> _embedding
  LIMIT _limit
$$;
GRANT EXECUTE ON FUNCTION public.match_similar_jobs(vector, uuid, integer) TO authenticated;

CREATE TABLE public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  request_id text NOT NULL,
  source text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX error_events_org_created_idx ON public.error_events(organization_id, created_at DESC);
GRANT SELECT, INSERT ON public.error_events TO authenticated;
GRANT ALL ON public.error_events TO service_role;
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY error_events_insert_own ON public.error_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (organization_id IS NULL OR public.is_org_member(organization_id)));
CREATE POLICY error_events_select_admin ON public.error_events FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND (public.has_role(auth.uid(), organization_id, 'owner') OR public.has_role(auth.uid(), organization_id, 'admin')));