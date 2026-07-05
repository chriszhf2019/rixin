'use client';

import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useReminderChecker } from '@/lib/hooks/useReminderChecker';
import { NotificationPrompt } from './NotificationPrompt';

export function ClientProvider({ children }: { children: React.ReactNode }) {
  useReminderChecker();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <NotificationPrompt />
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
