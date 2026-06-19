DROP POLICY IF EXISTS chamados_update_policy ON public.chamados;
CREATE POLICY chamados_update_policy ON public.chamados
FOR UPDATE TO authenticated
USING (
  is_active(auth.uid()) AND (
    auth.uid() = solicitante_id
    OR has_role(auth.uid(), 'atendente'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);