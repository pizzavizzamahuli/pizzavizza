import type { Metadata } from 'next';
import './globals.css';
import { ChatbotToggle } from '@/src/components/chatbot/chatbot-toggle';
import { ServiceWorkerCleanup } from '@/src/components/pwa/service-worker-cleanup';

export const dynamic = 'force-dynamic';

export const viewport = {
  themeColor: '#f59e0b',
};

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'Pizza Vizza',
  description: 'Pizza Vizza online ordering and private dining',
  keywords: ['pizza', 'restaurant', 'delivery', 'admin'],
  icons: [
    {
      rel: 'icon',
      url: '/icon-192.png',
    },
    {
      rel: 'apple-touch-icon',
      url: '/icon-192.png',
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ServiceWorkerCleanup />
        <ChatbotToggle />
        {children}
      </body>
    </html>
  );
}
