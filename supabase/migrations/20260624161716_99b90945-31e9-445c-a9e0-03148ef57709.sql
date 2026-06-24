
-- 1) Cria o segredo no Vault (somente se ainda não existir)
DO $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'chamado_webhook_secret'
  ) INTO v_exists;

  IF NOT v_exists THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'chamado_webhook_secret',
      'Shared secret used by notificar_chamado_evento to authenticate calls to /api/public/hooks/chamado-notificar'
    );
  END IF;
END $$;

-- 2) Atualiza a função para enviar o segredo no header x-webhook-secret
CREATE OR REPLACE FUNCTION public.notificar_chamado_evento(
  _event text,
  _chamado_id uuid,
  _status_anterior text DEFAULT NULL,
  _status_novo text DEFAULT NULL,
  _mensagem_autor_id uuid DEFAULT NULL,
  _mensagem_preview text DEFAULT NULL
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
      'mensagem_preview', _mensagem_preview
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notificar_chamado_evento falhou: %', SQLERRM;
END;
$function$;
