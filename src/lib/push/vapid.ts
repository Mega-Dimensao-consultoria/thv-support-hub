// Chave pública VAPID — segura para expor ao cliente.
// Para rotacionar, gere novo par com `bunx web-push generate-vapid-keys` e
// atualize VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY (secrets) + esta constante.
export const VAPID_PUBLIC_KEY =
  'BFXCl8A-QUZw7frZeft98VgriknIPi9z5_pgLmS8_qim8SvproawZ-OSFllZHTtVea0c8ZXmh2kbcYvLreObqv4';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}