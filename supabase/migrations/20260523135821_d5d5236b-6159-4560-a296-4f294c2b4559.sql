
-- 1) perfis_usuarios: restrict sensitive columns via column-level grants
REVOKE SELECT ON public.perfis_usuarios FROM anon, authenticated;
GRANT SELECT (id, nome, email, empresa_id, bloqueado, removido, nome_historico)
  ON public.perfis_usuarios TO authenticated;

-- Keep existing row-level policy permissive (RLS unchanged), but column grants
-- now hide bloqueado_por, bloqueado_em, removido_em, created_at, updated_at
-- from regular clients. Admin operations go through service role (admin.functions.ts).

-- 2) empresas: require authentication for SELECT
DROP POLICY IF EXISTS empresas_select_all ON public.empresas;
CREATE POLICY empresas_select_auth ON public.empresas
  FOR SELECT TO authenticated USING (true);

-- 3) gestor_departamentos: restrict SELECT to admin / gestor / self
DROP POLICY IF EXISTS gestor_deptos_select_auth ON public.gestor_departamentos;
CREATE POLICY gestor_deptos_select_scoped ON public.gestor_departamentos
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  );

-- 4) Revoke EXECUTE on SECURITY DEFINER helper functions from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_active(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_gestor_of_dept(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_gestor_of_user(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_dept_gestor(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_empresa(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gestor_of_dept(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gestor_of_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dept_gestor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_empresa(uuid) TO authenticated;

-- 5) Fix search_path on remaining functions
CREATE OR REPLACE FUNCTION public.gen_protocolo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.protocolo IS NULL THEN
    NEW.protocolo := 'THV-' || EXTRACT(YEAR FROM now())::TEXT || '-' ||
                     LPAD(nextval('public.chamados_protocolo_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.data_atualizacao := now();
  RETURN NEW;
END;
$function$;
