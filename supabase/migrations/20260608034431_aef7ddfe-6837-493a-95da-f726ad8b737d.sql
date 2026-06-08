-- 1. Configuração de Storage para Anexos
-- O bucket 'chamados-anexos' já foi criado via ferramenta dedicada.
-- Agora definimos as políticas de RLS para o bucket no schema storage.
CREATE POLICY "anexos_select_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chamados-anexos');

CREATE POLICY "anexos_insert_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chamados-anexos');

-- 2. Melhoria na tabela de mensagens para suportar anexos
ALTER TABLE public.mensagens_chamado ADD COLUMN IF NOT EXISTS anexo_url TEXT;

-- 3. Função para Dashboard (Estatísticas de SLA e Volume)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
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
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Automação: Fechamento por Inatividade
-- Esta função deve ser chamada por um cron job ou via Edge Function
CREATE OR REPLACE FUNCTION public.fechar_chamados_inativos()
RETURNS void AS $$
BEGIN
  UPDATE public.chamados
  SET status = 'concluido',
      data_atualizacao = now()
  WHERE status = 'aguardando_solicitante'
    AND data_atualizacao < now() - interval '5 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
