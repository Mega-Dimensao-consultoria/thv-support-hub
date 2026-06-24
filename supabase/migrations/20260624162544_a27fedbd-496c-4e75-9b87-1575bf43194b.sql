
-- Substitui a assinatura para incluir _mensagem_id
DROP FUNCTION IF EXISTS public.notificar_chamado_evento(text, uuid, text, text, uuid, text);

CREATE OR REPLACE FUNCTION public.notificar_chamado_evento(
  _event text,
  _chamado_id uuid,
  _status_anterior text DEFAULT NULL,
  _status_novo text DEFAULT NULL,
  _mensagem_autor_id uuid DEFAULT NULL,
  _mensagem_preview text DEFAULT NULL,
  _mensagem_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url text := 'https://chamados.grupothv.com.br/api/public/hooks/chamado-notificar';
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'chamado_webhook_secret'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE WARNING 'notificar_chamado_evento: chamado_webhook_secret não encontrado no Vault';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'event', _event,
      'chamado_id', _chamado_id,
      'status_anterior', _status_anterior,
      'status_novo', _status_novo,
      'mensagem_autor_id', _mensagem_autor_id,
      'mensagem_preview', _mensagem_preview,
      'mensagem_id', _mensagem_id
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notificar_chamado_evento falhou: %', SQLERRM;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notificar_chamado_evento(text, uuid, text, text, uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notificar_chamado_evento(text, uuid, text, text, uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notificar_chamado_evento(text, uuid, text, text, uuid, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notificar_chamado_evento(text, uuid, text, text, uuid, text, uuid) TO service_role;

-- Atualiza o trigger de mensagens para passar NEW.id
CREATE OR REPLACE FUNCTION public.tg_mensagem_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.mensagens_chamado
  WHERE chamado_id = NEW.chamado_id;

  IF v_count <= 1 THEN
    RETURN NEW;
  END IF;

  PERFORM public.notificar_chamado_evento(
    'mensagem', NEW.chamado_id, NULL, NULL, NEW.usuario_id, NEW.mensagem, NEW.id
  );
  RETURN NEW;
END;
$function$;
