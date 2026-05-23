
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('solicitante', 'atendente', 'gestor');

CREATE TYPE public.chamado_status AS ENUM (
  'aguardando_aprovacao',
  'atribuido',
  'concluido',
  'aguardando_tratativa',
  'aguardando_tratativa_externa',
  'aguardando_solicitante',
  'reprovado',
  'sem_resolucao'
);

CREATE TYPE public.tipo_campo AS ENUM ('texto', 'multipla_escolha');

-- =========================
-- TABELAS BASE
-- =========================
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.empresas (nome) VALUES
  ('THV Saneamento Ltda'),
  ('Soluções D''água'),
  ('Soluções Locadora');

CREATE TABLE public.perfis_usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  gestor_id UUID REFERENCES public.perfis_usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.topicos_suporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.perguntas_triagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topico_id UUID NOT NULL REFERENCES public.topicos_suporte(id) ON DELETE CASCADE,
  pergunta_texto TEXT NOT NULL,
  tipo_campo public.tipo_campo NOT NULL DEFAULT 'texto',
  opcoes TEXT[] DEFAULT '{}'::TEXT[],
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- CHAMADOS
-- =========================
CREATE SEQUENCE public.chamados_protocolo_seq START 1;

CREATE TABLE public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo TEXT UNIQUE,
  solicitante_id UUID NOT NULL REFERENCES public.perfis_usuarios(id) ON DELETE CASCADE,
  empresa_solicitante_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE RESTRICT,
  topico_id UUID NOT NULL REFERENCES public.topicos_suporte(id) ON DELETE RESTRICT,
  status public.chamado_status NOT NULL DEFAULT 'aguardando_aprovacao',
  atendente_id UUID REFERENCES public.perfis_usuarios(id) ON DELETE SET NULL,
  gestor_aprovador_id UUID REFERENCES public.perfis_usuarios(id) ON DELETE SET NULL,
  mensagem_inicial TEXT,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chamados_solicitante ON public.chamados(solicitante_id);
CREATE INDEX idx_chamados_atendente ON public.chamados(atendente_id);
CREATE INDEX idx_chamados_departamento ON public.chamados(departamento_id);
CREATE INDEX idx_chamados_status ON public.chamados(status);

CREATE TABLE public.respostas_triagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  pergunta_texto TEXT NOT NULL,
  resposta_texto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mensagens_chamado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.perfis_usuarios(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  data_envio TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagens_chamado ON public.mensagens_chamado(chamado_id, data_envio);

CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL UNIQUE REFERENCES public.chamados(id) ON DELETE CASCADE,
  nota INT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  feedback_texto TEXT,
  data_avaliacao TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- FUNÇÕES DE SEGURANÇA
-- =========================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_empresa(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.perfis_usuarios WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_dept_gestor(_user_id UUID, _dept_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.departamentos
    WHERE id = _dept_id AND gestor_id = _user_id
  )
$$;

-- =========================
-- TRIGGER: novo usuário
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  v_empresa_id := NULLIF(NEW.raw_user_meta_data->>'empresa_id', '')::UUID;

  INSERT INTO public.perfis_usuarios (id, nome, email, empresa_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_empresa_id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'solicitante');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- TRIGGER: protocolo
-- =========================
CREATE OR REPLACE FUNCTION public.gen_protocolo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.protocolo IS NULL THEN
    NEW.protocolo := 'THV-' || EXTRACT(YEAR FROM now())::TEXT || '-' ||
                     LPAD(nextval('public.chamados_protocolo_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_chamado_protocolo
BEFORE INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.gen_protocolo();

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.data_atualizacao := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER chamados_touch
BEFORE UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================
-- RLS
-- =========================
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topicos_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perguntas_triagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_triagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_chamado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- EMPRESAS: leitura pública (necessário para cadastro)
CREATE POLICY "empresas_select_all" ON public.empresas FOR SELECT USING (true);
CREATE POLICY "empresas_gestor_write" ON public.empresas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- PERFIS: leitura para autenticados; usuário pode atualizar o próprio
CREATE POLICY "perfis_select_auth" ON public.perfis_usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_update_self" ON public.perfis_usuarios FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "perfis_gestor_all" ON public.perfis_usuarios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- USER_ROLES: usuário vê suas roles; gestor vê todas e gerencia
CREATE POLICY "roles_select_self" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "roles_gestor_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- DEPARTAMENTOS: leitura autenticada; gestor gerencia
CREATE POLICY "deptos_select_auth" ON public.departamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "deptos_gestor_write" ON public.departamentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- TOPICOS
CREATE POLICY "topicos_select_auth" ON public.topicos_suporte FOR SELECT TO authenticated USING (true);
CREATE POLICY "topicos_gestor_write" ON public.topicos_suporte FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- PERGUNTAS TRIAGEM
CREATE POLICY "perguntas_select_auth" ON public.perguntas_triagem FOR SELECT TO authenticated USING (true);
CREATE POLICY "perguntas_gestor_write" ON public.perguntas_triagem FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- CHAMADOS
CREATE POLICY "chamados_select_envolvidos" ON public.chamados FOR SELECT TO authenticated
  USING (
    solicitante_id = auth.uid()
    OR atendente_id = auth.uid()
    OR public.has_role(auth.uid(), 'gestor')
    OR (public.has_role(auth.uid(), 'atendente') AND atendente_id IS NULL)
  );

CREATE POLICY "chamados_insert_self" ON public.chamados FOR INSERT TO authenticated
  WITH CHECK (solicitante_id = auth.uid());

CREATE POLICY "chamados_update_envolvidos" ON public.chamados FOR UPDATE TO authenticated
  USING (
    solicitante_id = auth.uid()
    OR atendente_id = auth.uid()
    OR public.has_role(auth.uid(), 'gestor')
  )
  WITH CHECK (
    solicitante_id = auth.uid()
    OR atendente_id = auth.uid()
    OR public.has_role(auth.uid(), 'gestor')
  );

-- RESPOSTAS TRIAGEM
CREATE POLICY "respostas_select_envolvidos" ON public.respostas_triagem FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = chamado_id
      AND (c.solicitante_id = auth.uid() OR c.atendente_id = auth.uid() OR public.has_role(auth.uid(), 'gestor'))
    )
  );

CREATE POLICY "respostas_insert_solicitante" ON public.respostas_triagem FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = chamado_id AND c.solicitante_id = auth.uid()
    )
  );

-- MENSAGENS
CREATE POLICY "mensagens_select_envolvidos" ON public.mensagens_chamado FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = chamado_id
      AND (c.solicitante_id = auth.uid() OR c.atendente_id = auth.uid() OR public.has_role(auth.uid(), 'gestor'))
    )
  );

CREATE POLICY "mensagens_insert_envolvidos" ON public.mensagens_chamado FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = chamado_id
      AND (c.solicitante_id = auth.uid() OR c.atendente_id = auth.uid() OR public.has_role(auth.uid(), 'gestor'))
    )
  );

-- AVALIACOES
CREATE POLICY "avaliacoes_select_envolvidos" ON public.avaliacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = chamado_id
      AND (c.solicitante_id = auth.uid() OR c.atendente_id = auth.uid() OR public.has_role(auth.uid(), 'gestor'))
    )
  );

CREATE POLICY "avaliacoes_insert_solicitante" ON public.avaliacoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = chamado_id AND c.solicitante_id = auth.uid()
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_chamado;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados;
