import { supabase } from '@/integrations/supabase/client';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from './vapid';

const PREVIEW_HOST_SUFFIXES = [
  'lovableproject.com',
  'lovableproject-dev.com',
  'beta.lovable.dev',
];

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Só registramos SW em produção e fora do editor/preview. */
export function canRegisterHere(): boolean {
  if (typeof window === 'undefined') return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  const host = window.location.hostname;
  if (host.startsWith('id-preview--') || host.startsWith('preview--')) return false;
  if (PREVIEW_HOST_SUFFIXES.some((h) => host === h || host.endsWith('.' + h))) return false;
  if (new URLSearchParams(window.location.search).get('sw') === 'off') return false;
  return true;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  if (!canRegisterHere()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (e) {
    console.warn('SW register failed', e);
    return null;
  }
}

export async function currentPushPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
}

export async function isSubscribedHere(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await ensureServiceWorker();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

export async function subscribeToPush(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (!canRegisterHere()) return { ok: false, reason: 'preview' };
  // Registra o SW PRIMEIRO — evita pedir permissão se nem SW conseguimos.
  const reg = await ensureServiceWorker();
  if (!reg) return { ok: false, reason: 'no-sw' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: perm };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    });
  }

  const json = sub.toJSON();
  const endpoint = sub.endpoint;
  const p256dh = json.keys?.p256dh ?? '';
  const auth = json.keys?.auth ?? '';
  if (!endpoint || !p256dh || !auth) return { ok: false, reason: 'no-keys' };

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );
  if (error) {
    console.error('persist push sub failed', error);
    return { ok: false, reason: 'persist-failed' };
  }
  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await ensureServiceWorker();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  } catch (e) {
    console.warn('delete push sub row failed', e);
  }
  await sub.unsubscribe();
}