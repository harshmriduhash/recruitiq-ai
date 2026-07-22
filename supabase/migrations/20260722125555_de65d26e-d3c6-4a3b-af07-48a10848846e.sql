
-- Onboarding completion marker
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Allow owners/admins to manage team roles
CREATE POLICY "admins manage user roles insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org()
              AND (public.has_role(auth.uid(), organization_id, 'owner') OR public.has_role(auth.uid(), organization_id, 'admin')));
CREATE POLICY "admins manage user roles update" ON public.user_roles FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_org()
         AND (public.has_role(auth.uid(), organization_id, 'owner') OR public.has_role(auth.uid(), organization_id, 'admin')));
CREATE POLICY "admins manage user roles delete" ON public.user_roles FOR DELETE TO authenticated
  USING (organization_id = public.current_user_org()
         AND (public.has_role(auth.uid(), organization_id, 'owner') OR public.has_role(auth.uid(), organization_id, 'admin')));

-- Recruiters can write embeddings for their org's candidates
CREATE POLICY "recruiters insert embeddings" ON public.resume_embeddings FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org()
              AND (public.has_role(auth.uid(), organization_id, 'owner')
                   OR public.has_role(auth.uid(), organization_id, 'admin')
                   OR public.has_role(auth.uid(), organization_id, 'recruiter')));

-- Pipeline runs write policy
CREATE POLICY "recruiters manage pipeline runs" ON public.pipeline_runs FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "recruiters update pipeline runs" ON public.pipeline_runs FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_org());

-- Full-text search on candidates.raw_resume_text
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(candidate_name,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(candidate_email,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(raw_resume_text,'')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_candidates_fts ON public.candidates USING gin(search_tsv);

-- Hybrid search RPC (FTS + optional semantic).  Callers must be authenticated;
-- RLS on candidates automatically scopes results to the current org.
CREATE OR REPLACE FUNCTION public.search_candidates(_query text, _limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  candidate_name text,
  candidate_email text,
  job_requisition_id uuid,
  created_at timestamptz,
  rank real
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT c.id, c.candidate_name, c.candidate_email, c.job_requisition_id, c.created_at,
         ts_rank(c.search_tsv, plainto_tsquery('english', _query))::real AS rank
  FROM public.candidates c
  WHERE c.deleted_at IS NULL
    AND (_query = '' OR c.search_tsv @@ plainto_tsquery('english', _query))
  ORDER BY rank DESC NULLS LAST, c.created_at DESC
  LIMIT _limit
$$;
GRANT EXECUTE ON FUNCTION public.search_candidates(text, int) TO authenticated;
