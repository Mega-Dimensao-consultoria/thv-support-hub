// Servidor: enviar Web Push usando web-push (Node compat no Worker).
// Carregado dinamicamente para não vazar para o bundle do cliente.
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:no-reply@chamados.grupothv.com.br';
  if (!pub || !priv) {
    throw new Error('VAPID keys not configured');
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

function adminClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return;
  try {
    ensureConfigured();
  } catch (e) {
    console.warn('Push not configured', e);
    return;
  }
  const supabase = adminClient();
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', ids);
  if (error) {
    console.error('list push subs failed', error);
    return;
  }
  if (!subs || subs.length === 0) return;

  const json = JSON.stringify(payload);
  const stale: string[] = [];

  await Promise.all(
    subs.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json,
          { TTL: 60 * 60 * 24 },
        );
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          stale.push(s.id);
        } else {
          console.warn('push send failed', status, err?.body);
        }
      }
    }),
  );

  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', stale);
  }
}