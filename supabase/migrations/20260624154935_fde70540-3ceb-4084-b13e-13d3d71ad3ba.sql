
-- 1. Migrar dados de departamentos.gestor_id para gestor_departamentos
INSERT INTO public.gestor_departamentos (user_id, departamento_id)
SELECT d.gestor_id, d.id
FROM public.departamentos d
WHERE d.gestor_id IS NOT NULL
ON CONFLICT (user_id, departamento_id) DO NOTHING;

-- 2. Remover coluna legada departamentos.gestor_id
ALTER TABLE public.departamentos DROP COLUMN IF EXISTS gestor_id;

-- 3. Remover função legada is_dept_gestor (substituída por is_gestor_of_dept)
DROP FUNCTION IF EXISTS public.is_dept_gestor(uuid, uuid);

-- 4. Remover coluna nunca utilizada perfis_usuarios.bloqueado_por
ALTER TABLE public.perfis_usuarios DROP COLUMN IF EXISTS bloqueado_por;
