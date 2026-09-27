create or replace function public.consume_candidate_quota(_org_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o record;
begin
  if not public.is_org_member(_org_id) then raise exception 'FORBIDDEN'; end if;
  select * into o from organizations where id = _org_id for update;
  if o.period_started_at < now() - interval '1 month' then
    update organizations set candidates_used_this_period = 0, period_started_at = now() where id = _org_id;
    o.candidates_used_this_period := 0;
  end if;
  if o.candidates_used_this_period >= o.monthly_candidate_quota then
    raise exception 'QUOTA_EXCEEDED';
  end if;
  update organizations set candidates_used_this_period = candidates_used_this_period + 1 where id = _org_id;
  return jsonb_build_object('used', o.candidates_used_this_period + 1, 'quota', o.monthly_candidate_quota);
end $$;
revoke execute on function public.consume_candidate_quota(uuid) from public, anon;
grant execute on function public.consume_candidate_quota(uuid) to authenticated;