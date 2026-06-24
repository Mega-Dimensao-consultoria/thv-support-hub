
-- 1) Set search_path on the 4 functions missing it (pgmq wrappers)
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 2) Revoke EXECUTE from PUBLIC/anon/authenticated on ALL SECURITY DEFINER functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- 3) Grant EXECUTE back to authenticated only on functions actually called by app users
--    (helpers used inside RLS policies + RPC used by the dashboard)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active(uuid)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gestor_of_dept(uuid, uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gestor_of_user(uuid, uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_empresa(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats()             TO authenticated;

-- 4) Service role always retains full access
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
