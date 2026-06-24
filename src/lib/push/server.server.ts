// Servidor: envia Web Push via @block65/webcrypto-web-push (Workers-native).
// Carregado dinamicamente para não vazar para o bundle do cliente.
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { createClient } from '@supabase/supabase-js';
import { VAPID_PUBLIC_KEY } from './vapid';

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
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:no-reply@chamados.grupothv.com.br';
  if (!privateKey) {
    console.warn('VAPID_PRIVATE_KEY not set; skipping push');
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

  // O service worker espera { title, body, url, tag } — mantemos as duas chaves
  // url/link por compatibilidade.
  const data = { ...payload, link: payload.url };
  const vapid = { subject, publicKey: VAPID_PUBLIC_KEY, privateKey };
  const stale: string[] = [];

  await Promise.allSettled(
    subs.map(async (s: any) => {
      const subscription = {
        endpoint: s.endpoint,
        expirationTime: null,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        const req = await buildPushPayload(
          { data, options: { ttl: 60 * 60 * 24 } },
          subscription,
          vapid,
        );
        const res = await fetch(s.endpoint, {
          method: req.method,
          headers: req.headers,
          body: new Uint8Array(req.body) as BodyInit,
        });
        if (res.status === 404 || res.status === 410) {
          stale.push(s.id);
        } else if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.warn('push send failed', res.status, text.slice(0, 200));
        }
      } catch (e) {
        console.warn('push build/send error', e);
      }
    }),
  );

  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', stale);
  }
}