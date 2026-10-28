import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ScamGuard — Cek Dulu Sebelum Transfer', template: '%s · ScamGuard' },
  description: 'Panduan darurat dan Evidence Pack untuk korban penipuan digital.',
};

export const viewport: Viewport = { themeColor: '#0F766E', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="flex min-h-screen flex-col bg-bg">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
