'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useReminderChecker() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch reminders that are due within the next 5 minutes and not yet notified
      const now = new Date().toISOString();
      const fiveMinLater = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const { data: reminders } = await supabase
        .from('reminders')
        .select('*, task:tasks(id, title)')
        .eq('notified', false)
        .gte('remind_at', now)
        .lte('remind_at', fiveMinLater);

      if (!reminders || reminders.length === 0) return;

      for (const reminder of reminders) {
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⏰ 任务提醒', {
            body: reminder.task?.title ?? '有任务需要处理',
            icon: '/icons/icon-192x192.svg',
            tag: `reminder-${reminder.id}`,
          });
        }

        // Mark as notified
        await supabase.from('reminders').update({ notified: true }).eq('id', reminder.id);
      }
    };

    // Check every 60 seconds
    check();
    intervalRef.current = setInterval(check, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
