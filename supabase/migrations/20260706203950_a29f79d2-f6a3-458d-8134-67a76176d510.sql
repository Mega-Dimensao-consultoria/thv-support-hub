
-- 1) get_dashboard_stats: enforce role + scope for gestor
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  v_is_admin BOOLEAN;
  v_is_gestor BOOLEAN;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin');
  v_is_gestor := public.has_role(auth.uid(), 'gestor');

  IF NOT (v_is_admin OR v_is_gestor) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_is_admin THEN
    SELECT jsonb_build_object(
      'total_abertos', (SELECT count(*) FROM public.chamados WHERE status NOT IN ('concluido', 'reprovado', 'sem_resolucao')),
      'total_concluidos', (SELECT count(*) FROM public.chamados WHERE status = 'concluido'),
      'por_departamento', (
        SELECT jsonb_agg(t) FROM (
          SELECT d.nome, count(c.id) as total
          FROM public.departamentos d
          LEFT JOIN public.chamados c ON c.departamento_id = d.id
          GROUP BY d.nome
        ) t
      ),
      'tempo_medio_conclusao', (
        SELECT avg(data_atualizacao - data_criacao) FILTER (WHERE status = 'concluido') FROM public.chamados
      )
    ) INTO result;
  ELSE
    -- gestor: scope to managed departments
    SELECT jsonb_build_object(
      'total_abertos', (
        SELECT count(*) FROM public.chamados c
        WHERE c.status NOT IN ('concluido', 'reprovado', 'sem_resolucao')
          AND c.departamento_id IN (SELECT departamento_id FROM public.gestor_departamentos WHERE user_id = auth.uid())
      ),
      'total_concluidos', (
        SELECT count(*) FROM public.chamados c
        WHERE c.status = 'concluido'
          AND c.departamento_id IN (SELECT departamento_id FROM public.gestor_departamentos WHERE user_id = auth.uid())
      ),
      'por_departamento', (
        SELECT jsonb_agg(t) FROM (
          SELECT d.nome, count(c.id) as total
          FROM public.departamentos d
          LEFT JOIN public.chamados c ON c.departamento_id = d.id
          WHERE d.id IN (SELECT departamento_id FROM public.gestor_departamentos WHERE user_id = auth.uid())
          GROUP BY d.nome
        ) t
      ),
      'tempo_medio_conclusao', (
        SELECT avg(c.data_atualizacao - c.data_criacao) FILTER (WHERE c.status = 'concluido')
        FROM public.chamados c
        WHERE c.departamento_id IN (SELECT departamento_id FROM public.gestor_departamentos WHERE user_id = auth.uid())
      )
    ) INTO result;
  END IF;

  RETURN result;
END;
$function$;

-- 2) chamados update: add WITH CHECK to prevent solicitantes from altering assignment fields (defense in depth)
DROP POLICY IF EXISTS chamados_update_policy ON public.chamados;
CREATE POLICY chamados_update_policy ON public.chamados
FOR UPDATE
USING (
  is_active(auth.uid()) AND (
    (auth.uid() = solicitante_id)
    OR has_role(auth.uid(), 'atendente'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  is_active(auth.uid()) AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'atendente'::app_role)
    OR (
      auth.uid() = solicitante_id
      AND solicitante_id = (SELECT c.solicitante_id FROM public.chamados c WHERE c.id = chamados.id)
      AND departamento_id = (SELECT c.departamento_id FROM public.chamados c WHERE c.id = chamados.id)
      AND atendente_id IS NOT DISTINCT FROM (SELECT c.atendente_id FROM public.chamados c WHERE c.id = chamados.id)
      AND gestor_aprovador_id IS NOT DISTINCT FROM (SELECT c.gestor_aprovador_id FROM public.chamados c WHERE c.id = chamados.id)
    )
  )
);

-- 3) perfis_usuarios: scope atendente reads to profiles involved in chamados they own or unassigned
CREATE OR REPLACE FUNCTION public.atendente_can_view_profile(_viewer uuid, _profile uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chamados c
    WHERE (c.solicitante_id = _profile OR c.atendente_id = _profile)
      AND (c.atendente_id = _viewer OR c.atendente_id IS NULL)
  )
$$;

DROP POLICY IF EXISTS perfis_select_auth ON public.perfis_usuarios;
CREATE POLICY perfis_select_auth ON public.perfis_usuarios
FOR SELECT
USING (
  auth.uid() = id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR (
    has_role(auth.uid(), 'atendente'::app_role)
    AND public.atendente_can_view_profile(auth.uid(), id)
  )
  OR (empresa_id IS NOT NULL AND empresa_id = get_user_empresa(auth.uid()))
);
