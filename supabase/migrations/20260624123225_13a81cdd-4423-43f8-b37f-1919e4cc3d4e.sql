
-- Triggers que disparam notificações por e-mail via pg_net.
-- Endpoint: /api/public/hooks/chamado-notificar (validado pela apikey/anon).

CREATE OR REPLACE FUNCTION public.notificar_chamado_evento(
  _event text,
  _chamado_id uuid,
  _status_anterior text DEFAULT NULL,
  _status_novo text DEFAULT NULL,
  _mensagem_autor_id uuid DEFAULT NULL,
  _mensagem_preview text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://chamados.grupothv.com.br/api/public/hooks/chamado-notificar';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwamxtbWpzY3pvdGh0YWZqc2ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MTExMzAsImV4cCI6MjA5NTA4NzEzMH0.zNrWxTwqqwO65g3pdw02YivXDi1KUqlH1PafNj7faaA';
BEGIN
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey', v_anon
    ),
    body := jsonb_build_object(
      'event', _event,
      'chamado_id', _chamado_id,
      'status_anterior', _status_anterior,
      'status_novo', _status_novo,
      'mensagem_autor_id', _mensagem_autor_id,
      'mensagem_preview', _mensagem_preview
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- nunca falhar a transação por erro de notificação
  RAISE WARNING 'notificar_chamado_evento falhou: %', SQLERRM;
END;
$$;

-- Trigger: novo chamado -> 'novo' (gestores) e, se já tem atendente, 'atribuido'
CREATE OR REPLACE FUNCTION public.tg_chamado_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notificar_chamado_evento('novo', NEW.id, NULL, NEW.status::text);
  IF NEW.atendente_id IS NOT NULL THEN
    PERFORM public.notificar_chamado_evento('atribuido', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chamado_after_insert ON public.chamados;
CREATE TRIGGER trg_chamado_after_insert
AFTER INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.tg_chamado_after_insert();

-- Trigger: update de chamado -> 'status', 'atribuido', 'concluido'
CREATE OR REPLACE FUNCTION public.tg_chamado_after_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.atendente_id IS DISTINCT FROM OLD.atendente_id AND NEW.atendente_id IS NOT NULL THEN
    PERFORM public.notificar_chamado_evento('atribuido', NEW.id);
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notificar_chamado_evento(
      'status', NEW.id, OLD.status::text, NEW.status::text
    );
    IF NEW.status = 'concluido' THEN
      PERFORM public.notificar_chamado_evento('concluido', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chamado_after_update ON public.chamados;
CREATE TRIGGER trg_chamado_after_update
AFTER UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.tg_chamado_after_update();

-- Trigger: nova mensagem -> 'mensagem' (notifica counterpart).
-- Ignora a primeira mensagem (a do próprio insert do chamado), já coberta pelo 'novo'.
CREATE OR REPLACE FUNCTION public.tg_mensagem_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.mensagens_chamado
  WHERE chamado_id = NEW.chamado_id;

  IF v_count <= 1 THEN
    RETURN NEW; -- mensagem inicial; o trigger de novo chamado já notifica
  END IF;

  PERFORM public.notificar_chamado_evento(
    'mensagem', NEW.chamado_id, NULL, NULL, NEW.usuario_id, NEW.mensagem
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mensagem_after_insert ON public.mensagens_chamado;
CREATE TRIGGER trg_mensagem_after_insert
AFTER INSERT ON public.mensagens_chamado
FOR EACH ROW EXECUTE FUNCTION public.tg_mensagem_after_insert();
