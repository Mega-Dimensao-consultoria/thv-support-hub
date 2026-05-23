
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_settings_select_public ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY site_settings_admin_write ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.site_settings TO anon, authenticated;

INSERT INTO public.site_settings (key, value) VALUES
  ('hero_badge', 'Central de Atendimento Interno'),
  ('hero_title', 'Resolva qualquer demanda do Grupo THV em um só lugar.'),
  ('hero_subtitle', 'Abra chamados, acompanhe tratativas em tempo real e avalie atendimentos — para todas as empresas do grupo.'),
  ('hero_cta', 'Abrir Chamado'),
  ('empresas_title', 'Empresas do grupo'),
  ('feature_1_title', 'Resposta rápida'),
  ('feature_1_desc', 'Acompanhamento em tempo real'),
  ('feature_2_title', 'Triagem inteligente'),
  ('feature_2_desc', 'Perguntas dinâmicas por tópico'),
  ('feature_3_title', 'Gestão completa'),
  ('feature_3_desc', 'Dashboards e avaliações'),
  ('footer_text', 'Grupo THV. Central de Chamados Interna.')
ON CONFLICT (key) DO NOTHING;
