CREATE POLICY "empresas_select_anon_signup" ON public.empresas FOR SELECT TO anon USING (true);
GRANT SELECT ON public.empresas TO anon;