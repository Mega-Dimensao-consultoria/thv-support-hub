DROP VIEW IF EXISTS public.vw_gestao_usuarios;

CREATE VIEW public.vw_gestao_usuarios AS
SELECT 
  p.id,
  p.nome,
  p.email,
  p.empresa_id,
  e.nome as empresa_nome,
  p.bloqueado,
  p.removido,
  p.nome_historico,
  array_agg(DISTINCT ur.role) as roles,
  array_agg(DISTINCT gd.departamento_id) FILTER (WHERE gd.departamento_id IS NOT NULL) as departamento_ids
FROM public.perfis_usuarios p
LEFT JOIN public.empresas e ON e.id = p.empresa_id
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
LEFT JOIN public.gestor_departamentos gd ON gd.user_id = p.id
GROUP BY p.id, e.nome, p.nome_historico;

GRANT SELECT ON public.vw_gestao_usuarios TO authenticated;
