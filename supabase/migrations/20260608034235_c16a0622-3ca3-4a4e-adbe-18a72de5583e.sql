-- 1. Tabela de Auditoria de Chamados
CREATE TABLE IF NOT EXISTS public.auditoria_chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  campo_alterado TEXT NOT NULL,
  valor_antigo TEXT,
  valor_novo TEXT,
  data_alteracao TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.auditoria_chamados TO authenticated;
GRANT ALL ON public.auditoria_chamados TO service_role;
ALTER TABLE public.auditoria_chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria_select_envolvidos" ON public.auditoria_chamados
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chamados c 
      WHERE c.id = chamado_id AND (
        c.solicitante_id = auth.uid() OR 
        c.atendente_id = auth.uid() OR 
        public.has_role(auth.uid(), 'admin') OR
        (public.has_role(auth.uid(), 'gestor') AND c.departamento_id IN (SELECT departamento_id FROM public.gestor_departamentos WHERE user_id = auth.uid()))
      )
    )
  );

-- 2. Trigger de Auditoria para Status e Atendente
CREATE OR REPLACE FUNCTION public.fn_auditar_chamado()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.auditoria_chamados (chamado_id, usuario_id, campo_alterado, valor_antigo, valor_novo)
    VALUES (NEW.id, auth.uid(), 'status', OLD.status::text, NEW.status::text);
  END IF;
  
  IF (OLD.atendente_id IS DISTINCT FROM NEW.atendente_id) THEN
    INSERT INTO public.auditoria_chamados (chamado_id, usuario_id, campo_alterado, valor_antigo, valor_novo)
    VALUES (NEW.id, auth.uid(), 'atendente_id', OLD.atendente_id::text, NEW.atendente_id::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_auditar_chamado
  AFTER UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_chamado();

-- 3. View para performance de gestão de usuários (Join no banco em vez de Promise.all no app)
CREATE OR REPLACE VIEW public.vw_gestao_usuarios AS
SELECT 
  p.id,
  p.nome,
  p.email,
  p.empresa_id,
  e.nome as empresa_nome,
  p.bloqueado,
  p.removido,
  array_agg(DISTINCT ur.role) as roles,
  array_agg(DISTINCT gd.departamento_id) FILTER (WHERE gd.departamento_id IS NOT NULL) as departamento_ids
FROM public.perfis_usuarios p
LEFT JOIN public.empresas e ON e.id = p.empresa_id
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
LEFT JOIN public.gestor_departamentos gd ON gd.user_id = p.id
GROUP BY p.id, e.nome;

GRANT SELECT ON public.vw_gestao_usuarios TO authenticated;
