
-- 1. perfis_usuarios: flags de bloqueio/remoção
ALTER TABLE public.perfis_usuarios
  ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bloqueado_em timestamptz,
  ADD COLUMN IF NOT EXISTS bloqueado_por uuid,
  ADD COLUMN IF NOT EXISTS removido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS removido_em timestamptz,
  ADD COLUMN IF NOT EXISTS nome_historico text;

-- 2. gestor_departamentos: N:N
CREATE TABLE IF NOT EXISTS public.gestor_departamentos (
  user_id uuid NOT NULL,
  departamento_id uuid NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, departamento_id)
);
ALTER TABLE public.gestor_departamentos ENABLE ROW LEVEL SECURITY;

-- 3. Funções helper
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin'::app_role) $$;

CREATE OR REPLACE FUNCTION public.is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE id = _user_id AND bloqueado = false AND removido = false
  )
$$;

CREATE OR REPLACE FUNCTION public.is_gestor_of_dept(_user_id uuid, _dept_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gestor_departamentos
    WHERE user_id = _user_id AND departamento_id = _dept_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_gestor_of_user(_gestor_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- Solicitante é "do gestor" se compartilharem ao menos um chamado em departamento gerido pelo gestor.
  -- Para uso mais geral (bloquear pré-criação), usamos: empresa em comum + gestor existe.
  SELECT EXISTS (
    SELECT 1 FROM public.gestor_departamentos gd
    JOIN public.chamados c ON c.departamento_id = gd.departamento_id
    WHERE gd.user_id = _gestor_id AND c.solicitante_id = _target_user_id
  )
$$;

-- 4. RLS de gestor_departamentos
DROP POLICY IF EXISTS gestor_deptos_select_auth ON public.gestor_departamentos;
CREATE POLICY gestor_deptos_select_auth ON public.gestor_departamentos
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS gestor_deptos_admin_write ON public.gestor_departamentos;
CREATE POLICY gestor_deptos_admin_write ON public.gestor_departamentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. user_roles: só admin gerencia papéis
DROP POLICY IF EXISTS roles_gestor_write ON public.user_roles;
DROP POLICY IF EXISTS roles_admin_write ON public.user_roles;
CREATE POLICY roles_admin_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS roles_select_self ON public.user_roles;
CREATE POLICY roles_select_self ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- 6. perfis_usuarios: admin total; gestor pode atualizar bloqueio dos seus
DROP POLICY IF EXISTS perfis_gestor_all ON public.perfis_usuarios;
DROP POLICY IF EXISTS perfis_admin_all ON public.perfis_usuarios;
CREATE POLICY perfis_admin_all ON public.perfis_usuarios
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Empresas/departamentos/tópicos/perguntas: admin total + gestor mantém
DROP POLICY IF EXISTS empresas_gestor_write ON public.empresas;
CREATE POLICY empresas_admin_write ON public.empresas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS deptos_gestor_write ON public.departamentos;
CREATE POLICY deptos_admin_write ON public.departamentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS topicos_gestor_write ON public.topicos_suporte;
CREATE POLICY topicos_admin_or_gestor_write ON public.topicos_suporte
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

DROP POLICY IF EXISTS perguntas_gestor_write ON public.perguntas_triagem;
CREATE POLICY perguntas_admin_or_gestor_write ON public.perguntas_triagem
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- 8. chamados/mensagens: bloquear inserts de usuários inativos
DROP POLICY IF EXISTS chamados_insert_self ON public.chamados;
CREATE POLICY chamados_insert_self ON public.chamados
  FOR INSERT TO authenticated
  WITH CHECK (solicitante_id = auth.uid() AND public.is_active(auth.uid()));

DROP POLICY IF EXISTS mensagens_insert_envolvidos ON public.mensagens_chamado;
CREATE POLICY mensagens_insert_envolvidos ON public.mensagens_chamado
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND public.is_active(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = mensagens_chamado.chamado_id
        AND (c.solicitante_id = auth.uid() OR c.atendente_id = auth.uid() OR public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- 9. Atualiza policies "envolvidos" para incluir admin nas leituras/updates
DROP POLICY IF EXISTS chamados_select_envolvidos ON public.chamados;
CREATE POLICY chamados_select_envolvidos ON public.chamados
  FOR SELECT TO authenticated
  USING (
    solicitante_id = auth.uid()
    OR atendente_id = auth.uid()
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'atendente') AND atendente_id IS NULL)
  );

DROP POLICY IF EXISTS chamados_update_envolvidos ON public.chamados;
CREATE POLICY chamados_update_envolvidos ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    solicitante_id = auth.uid()
    OR atendente_id = auth.uid()
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    solicitante_id = auth.uid()
    OR atendente_id = auth.uid()
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS mensagens_select_envolvidos ON public.mensagens_chamado;
CREATE POLICY mensagens_select_envolvidos ON public.mensagens_chamado
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chamados c
    WHERE c.id = mensagens_chamado.chamado_id
      AND (c.solicitante_id = auth.uid() OR c.atendente_id = auth.uid() OR public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'))
  ));

-- avaliacoes / respostas / departamentos / topicos / perguntas: garantir admin acesso de leitura
DROP POLICY IF EXISTS avaliacoes_select_envolvidos ON public.avaliacoes;
CREATE POLICY avaliacoes_select_envolvidos ON public.avaliacoes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chamados c
    WHERE c.id = avaliacoes.chamado_id
      AND (c.solicitante_id = auth.uid() OR c.atendente_id = auth.uid() OR public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'))
  ));

DROP POLICY IF EXISTS respostas_select_envolvidos ON public.respostas_triagem;
CREATE POLICY respostas_select_envolvidos ON public.respostas_triagem
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chamados c
    WHERE c.id = respostas_triagem.chamado_id
      AND (c.solicitante_id = auth.uid() OR c.atendente_id = auth.uid() OR public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'))
  ));
