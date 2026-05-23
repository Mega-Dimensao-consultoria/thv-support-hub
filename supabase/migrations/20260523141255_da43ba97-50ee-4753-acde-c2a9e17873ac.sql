DROP POLICY IF EXISTS empresas_select_auth ON public.empresas;
CREATE POLICY empresas_select_public ON public.empresas FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.empresas TO anon;