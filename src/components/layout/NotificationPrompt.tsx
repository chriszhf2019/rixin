'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, BellRing, XCircle } from 'lucide-react';

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData.split('').map((c) => c.charCodeAt(0)));
}

export function NotificationPrompt() {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);

    // Show prompt if permission hasn't been decided yet
    if (Notification.permission === 'default') {
      const timer = setTimeout(() => setOpen(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      // Try to subscribe to push
      await subscribeToPush();
    }
    setOpen(false);
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!PUBLIC_VAPID_KEY) {
      console.warn('VAPID key not configured - push notifications unavailable');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  };

  if (permission === 'granted') return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <BellRing className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>开启任务提醒</DialogTitle>
          <DialogDescription>
            日新可以在任务到期时通过系统通知提醒你，不错过任何重要事项。
          </DialogDescription>
        </DialogHeader>

        {permission === 'unsupported' ? (
          <div className="text-center text-sm text-muted-foreground py-2">
            你的浏览器不支持通知功能。建议使用 Chrome 或 Safari，并将日新添加到主屏幕。
          </div>
        ) : (
          <div className="space-y-3">
            <Button className="w-full" onClick={requestPermission}>
              <Bell className="h-4 w-4 mr-2" />
              开启通知提醒
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setOpen(false)}>
              <XCircle className="h-4 w-4 mr-2" />
              稍后再说
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          开启后，即使浏览器在后台也能收到提醒。你随时可以在浏览器设置中关闭。
        </p>
      </DialogContent>
    </Dialog>
  );
}
