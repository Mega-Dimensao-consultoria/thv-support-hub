-- 1. Restringir acesso a campos sensíveis de RH em perfis_usuarios
REVOKE ALL ON public.perfis_usuarios FROM authenticated;
GRANT SELECT (id, nome, email, empresa_id, created_at, updated_at) ON public.perfis_usuarios TO authenticated;
GRANT ALL ON public.perfis_usuarios TO service_role;

-- 2. Trigger para impedir que solicitantes alterem campos críticos
CREATE OR REPLACE FUNCTION public.check_chamado_update_privileges()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o usuário não for admin, atendente ou gestor, aplicamos restrições
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'atendente') OR 
    public.has_role(auth.uid(), 'gestor')
  ) THEN
    -- Solicitante só pode alterar se for o dono
    IF (auth.uid() != OLD.solicitante_id) THEN
      RAISE EXCEPTION 'Acesso negado: você não é o solicitante deste chamado.';
    END IF;

    -- Bloquear alteração de campos críticos
    IF (NEW.departamento_id != OLD.departamento_id) OR
       (NEW.atendente_id IS DISTINCT FROM OLD.atendente_id) OR
       (NEW.gestor_aprovador_id IS DISTINCT FROM OLD.gestor_aprovador_id) OR
       (NEW.solicitante_id != OLD.solicitante_id) THEN
      RAISE EXCEPTION 'Acesso negado: solicitantes não podem alterar campos de atribuição ou departamento.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_chamado_update_privileges ON public.chamados;
CREATE TRIGGER tr_check_chamado_update_privileges
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.check_chamado_update_privileges();

-- 3. Corrigir políticas de SELECT e UPDATE (removendo a problemática)
DROP POLICY IF EXISTS "chamados_update_envolvidos" ON public.chamados;
CREATE POLICY "chamados_update_policy" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = solicitante_id OR 
    public.has_role(auth.uid(), 'atendente') OR 
    public.has_role(auth.uid(), 'gestor') OR 
    public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "chamados_select_envolvidos" ON public.chamados;
CREATE POLICY "chamados_select_policy" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    auth.uid() = solicitante_id OR
    auth.uid() = atendente_id OR
    public.has_role(auth.uid(), 'admin') OR
    (
      public.has_role(auth.uid(), 'atendente') AND atendente_id IS NULL
    ) OR
    (
      public.has_role(auth.uid(), 'gestor') AND 
      departamento_id IN (SELECT departamento_id FROM public.gestor_departamentos WHERE user_id = auth.uid())
    )
  );

-- 4. Restringir visualização de gestor_departamentos
DROP POLICY IF EXISTS "gestores_deptos_select_scoped" ON public.gestor_departamentos;
CREATE POLICY "gestores_deptos_select_own" ON public.gestor_departamentos
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );
