import type { Metadata, Viewport } from 'next';
import { ClientProvider } from '@/components/layout/ClientProvider';
import './globals.css';

export const metadata: Metadata = {
  title: '日新 - Daily Renew',
  description: '日有所进，日有所新 — 个人成长系统',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: '日新',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
      </head>
      <body>
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
}
