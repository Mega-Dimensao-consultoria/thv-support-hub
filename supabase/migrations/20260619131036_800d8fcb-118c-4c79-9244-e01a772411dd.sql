
-- 1) perfis_usuarios: restringir SELECT
DROP POLICY IF EXISTS perfis_select_auth ON public.perfis_usuarios;
CREATE POLICY perfis_select_auth ON public.perfis_usuarios
FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR (empresa_id IS NOT NULL AND empresa_id = get_user_empresa(auth.uid()))
);

-- 2) auditoria_chamados: bloquear escrita por usuários autenticados (triggers SECURITY DEFINER ignoram RLS)
CREATE POLICY auditoria_no_insert_auth ON public.auditoria_chamados
AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY auditoria_no_update_auth ON public.auditoria_chamados
AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY auditoria_no_delete_auth ON public.auditoria_chamados
AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- 3) avaliacoes: bloquear update/delete por usuários autenticados
CREATE POLICY avaliacoes_no_update_auth ON public.avaliacoes
AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY avaliacoes_no_delete_auth ON public.avaliacoes
AS RESTRICTIVE FOR DELETE TO authenticated USING (false);
