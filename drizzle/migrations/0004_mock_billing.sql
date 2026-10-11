ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE TABLE public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id uuid,
  event_type text NOT NULL,
  from_plan plan_tier,
  to_plan plan_tier,
  amount_cents integer NOT NULL DEFAULT 0,
  mock boolean NOT NULL DEFAULT true,
  reason text,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billing_events TO authenticated;
GRANT ALL ON public.billing_events TO service_role;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_events_select_org ON public.billing_events FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE OR REPLACE FUNCTION public.mock_change_plan(_plan plan_tier)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid := public.current_user_org(); _old plan_tier; _quota int; _price int;
BEGIN
  IF _org IS NULL OR NOT (public.has_role(auth.uid(), _org, 'owner') OR public.has_role(auth.uid(), _org, 'admin')) THEN
    RAISE EXCEPTION 'FORBIDDEN: only owners and admins can change the plan';
  END IF;
  IF _plan = 'free' THEN RAISE EXCEPTION 'Use cancellation to move to the free plan'; END IF;
  SELECT plan INTO _old FROM organizations WHERE id = _org;
  _quota := CASE _plan WHEN 'starter' THEN 200 WHEN 'growth' THEN 1000 ELSE 5000 END;
  _price := CASE _plan WHEN 'starter' THEN 9900 WHEN 'growth' THEN 29900 ELSE 0 END;
  UPDATE organizations SET plan = _plan, monthly_candidate_quota = _quota, subscription_status = 'active',
    current_period_end = now() + interval '1 month', cancel_at_period_end = false WHERE id = _org;
  INSERT INTO billing_events(organization_id, actor_user_id, event_type, from_plan, to_plan, amount_cents)
  VALUES (_org, auth.uid(), CASE WHEN _old = 'free' THEN 'subscribed' ELSE 'plan_changed' END, _old, _plan, _price);
  INSERT INTO audit_logs(organization_id, actor_user_id, action, target_type, target_id, metadata)
  VALUES (_org, auth.uid(), 'billing.plan_changed', 'organization', _org, jsonb_build_object('from', _old, 'to', _plan, 'mock', true));
  RETURN jsonb_build_object('plan', _plan, 'quota', _quota);
END $$;

CREATE OR REPLACE FUNCTION public.mock_cancel_subscription(_reason text, _feedback text DEFAULT NULL, _immediate boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid := public.current_user_org(); _old plan_tier;
BEGIN
  IF _org IS NULL OR NOT (public.has_role(auth.uid(), _org, 'owner') OR public.has_role(auth.uid(), _org, 'admin')) THEN
    RAISE EXCEPTION 'FORBIDDEN: only owners and admins can cancel';
  END IF;
  SELECT plan INTO _old FROM organizations WHERE id = _org;
  IF _old = 'free' THEN RAISE EXCEPTION 'You are already on the free plan'; END IF;
  IF _immediate THEN
    UPDATE organizations SET plan = 'free', monthly_candidate_quota = 20, subscription_status = 'canceled',
      cancel_at_period_end = false, current_period_end = NULL WHERE id = _org;
  ELSE
    UPDATE organizations SET cancel_at_period_end = true, subscription_status = 'canceling' WHERE id = _org;
  END IF;
  INSERT INTO billing_events(organization_id, actor_user_id, event_type, from_plan, to_plan, reason, feedback)
  VALUES (_org, auth.uid(), CASE WHEN _immediate THEN 'canceled' ELSE 'cancel_scheduled' END, _old, 'free', left(_reason, 200), left(_feedback, 2000));
  INSERT INTO audit_logs(organization_id, actor_user_id, action, target_type, target_id, metadata)
  VALUES (_org, auth.uid(), 'billing.canceled', 'organization', _org, jsonb_build_object('from', _old, 'immediate', _immediate, 'reason', _reason));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.mock_resume_subscription()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid := public.current_user_org();
BEGIN
  IF _org IS NULL OR NOT (public.has_role(auth.uid(), _org, 'owner') OR public.has_role(auth.uid(), _org, 'admin')) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE organizations SET cancel_at_period_end = false, subscription_status = 'active' WHERE id = _org AND plan <> 'free';
  INSERT INTO billing_events(organization_id, actor_user_id, event_type) VALUES (_org, auth.uid(), 'resumed');
  RETURN jsonb_build_object('ok', true);
END $$;

-- Lazily downgrade orgs whose cancellation date has passed.
CREATE OR REPLACE FUNCTION public.apply_due_cancellation()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE organizations SET plan = 'free', monthly_candidate_quota = 20, subscription_status = 'canceled',
    cancel_at_period_end = false, current_period_end = NULL
  WHERE id = public.current_user_org() AND cancel_at_period_end AND current_period_end <= now();
$$;

REVOKE EXECUTE ON FUNCTION public.mock_change_plan(plan_tier), public.mock_cancel_subscription(text, text, boolean), public.mock_resume_subscription(), public.apply_due_cancellation() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mock_change_plan(plan_tier), public.mock_cancel_subscription(text, text, boolean), public.mock_resume_subscription(), public.apply_due_cancellation() TO authenticated;