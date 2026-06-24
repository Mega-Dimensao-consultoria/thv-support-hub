CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove agendamento anterior se existir (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fechar-chamados-inativos') THEN
    PERFORM cron.unschedule('fechar-chamados-inativos');
  END IF;
END $$;

SELECT cron.schedule(
  'fechar-chamados-inativos',
  '0 3 * * *',
  $$SELECT public.fechar_chamados_inativos();$$
);