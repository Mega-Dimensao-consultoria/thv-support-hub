
REVOKE EXECUTE ON FUNCTION public.notificar_chamado_evento(text, uuid, text, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notificar_chamado_evento(text, uuid, text, text, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notificar_chamado_evento(text, uuid, text, text, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notificar_chamado_evento(text, uuid, text, text, uuid, text) TO service_role;
