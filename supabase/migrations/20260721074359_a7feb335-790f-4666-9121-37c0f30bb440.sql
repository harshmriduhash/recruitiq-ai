
-- Trigger-only functions: revoke from everyone; Postgres still runs them from triggers
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.tg_touch_updated_at() from public;

-- Helper functions: only authenticated users need to call them
revoke execute on function public.has_role(uuid, uuid, public.app_role) from public;
revoke execute on function public.current_user_org() from public;
revoke execute on function public.is_org_member(uuid) from public;
grant execute on function public.has_role(uuid, uuid, public.app_role) to authenticated;
grant execute on function public.current_user_org() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
