
-- 1. EMPRESAS: restringir leitura a autenticados
DROP POLICY IF EXISTS empresas_select_public ON public.empresas;
CREATE POLICY empresas_select_auth ON public.empresas
  FOR SELECT TO authenticated USING (true);

-- 2. PERFIS_USUARIOS: column-level grants + bloquear INSERT/DELETE direto
REVOKE SELECT ON public.perfis_usuarios FROM authenticated, anon;
GRANT SELECT (id, nome, email, empresa_id, created_at, updated_at, bloqueado, removido, nome_historico)
  ON public.perfis_usuarios TO authenticated;
-- admin lê tudo via service_role (supabaseAdmin); RLS permanece igual
-- Bloquear INSERT e DELETE de usuários autenticados (perfis criados pelo trigger handle_new_user com SECURITY DEFINER)
CREATE POLICY perfis_no_insert_auth ON public.perfis_usuarios
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY perfis_no_delete_auth ON public.perfis_usuarios
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- 3. VIEW vw_gestao_usuarios: garantir security_invoker
DROP VIEW IF EXISTS public.vw_gestao_usuarios;
CREATE VIEW public.vw_gestao_usuarios
  WITH (security_invoker = true) AS
  SELECT p.id, p.nome, p.email, p.empresa_id,
         e.nome AS empresa_nome,
         p.bloqueado, p.removido, p.nome_historico,
         array_agg(DISTINCT ur.role) AS roles,
         array_agg(DISTINCT gd.departamento_id) FILTER (WHERE gd.departamento_id IS NOT NULL) AS departamento_ids
    FROM public.perfis_usuarios p
    LEFT JOIN public.empresas e ON e.id = p.empresa_id
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    LEFT JOIN public.gestor_departamentos gd ON gd.user_id = p.id
   GROUP BY p.id, e.nome;
GRANT SELECT ON public.vw_gestao_usuarios TO service_role;

-- 4. Funções SECURITY DEFINER: revogar EXECUTE de anon e public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_dept_gestor(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_gestor_of_dept(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_gestor_of_user(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_empresa(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fechar_chamados_inativos() FROM PUBLIC, anon, authenticated;

-- 5. search_path nas funções faltantes
ALTER FUNCTION public.fn_auditar_chamado() SET search_path = public;
ALTER FUNCTION public.fechar_chamados_inativos() SET search_path = public;
ALTER FUNCTION public.check_chamado_update_privileges() SET search_path = public;
ALTER FUNCTION public.get_dashboard_stats() SET search_path = public;

-- 6. STORAGE: políticas para bucket chamados-anexos
-- Path convention: <chamado_id>/<uuid>.<ext>
DROP POLICY IF EXISTS anexos_select_policy ON storage.objects;
DROP POLICY IF EXISTS anexos_insert_policy ON storage.objects;
DROP POLICY IF EXISTS anexos_update_policy ON storage.objects;
DROP POLICY IF EXISTS anexos_delete_policy ON storage.objects;

CREATE POLICY anexos_select_policy ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chamados-anexos'
    AND EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id::text = split_part(storage.objects.name, '/', 1)
        AND (
          c.solicitante_id = auth.uid()
          OR c.atendente_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR (public.has_role(auth.uid(), 'atendente'::app_role) AND c.atendente_id IS NULL)
          OR (public.has_role(auth.uid(), 'gestor'::app_role)
              AND public.is_gestor_of_dept(auth.uid(), c.departamento_id))
        )
    )
  );

CREATE POLICY anexos_insert_policy ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chamados-anexos'
    AND EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id::text = split_part(storage.objects.name, '/', 1)
        AND (
          c.solicitante_id = auth.uid()
          OR c.atendente_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR (public.has_role(auth.uid(), 'atendente'::app_role) AND c.atendente_id IS NULL)
          OR (public.has_role(auth.uid(), 'gestor'::app_role)
              AND public.is_gestor_of_dept(auth.uid(), c.departamento_id))
        )
    )
  );

CREATE POLICY anexos_update_policy ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'chamados-anexos'
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY anexos_delete_policy ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chamados-anexos'
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  );
