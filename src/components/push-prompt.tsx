import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  isPushSupported,
  isSubscribedHere,
  subscribeToPush,
  unsubscribeFromPush,
  currentPushPermission,
} from '@/lib/push/client';

interface Props {
  userId: string;
  compact?: boolean;
}

export function PushPrompt({ userId, compact }: Props) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = isPushSupported();
      setSupported(ok);
      if (!ok) return;
      setPerm(await currentPushPermission());
      setSubscribed(await isSubscribedHere());
    })();
  }, []);

  if (!supported) return null;
  if (perm === 'denied') {
    return compact ? null : (
      <div className="text-xs text-muted-foreground">
        Notificações bloqueadas no navegador. Libere nas permissões do site.
      </div>
    );
  }

  async function handleToggle() {
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
        toast.success('Notificações desativadas neste dispositivo');
      } else {
        const res = await subscribeToPush(userId);
        if (res.ok) {
          setSubscribed(true);
          setPerm('granted');
          toast.success('Notificações ativadas neste dispositivo');
        } else if (res.reason === 'denied') {
          setPerm('denied');
          toast.error('Permissão negada');
        } else {
          toast.error('Não foi possível ativar notificações');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={subscribed ? 'ghost' : 'outline'}
      size={compact ? 'icon' : 'sm'}
      onClick={handleToggle}
      disabled={loading}
      title={subscribed ? 'Desativar notificações' : 'Ativar notificações'}
      className={compact ? '' : 'w-full justify-start'}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {!compact && (
        <span className="ml-2">{subscribed ? 'Notificações ativas' : 'Ativar notificações'}</span>
      )}
    </Button>
  );
}