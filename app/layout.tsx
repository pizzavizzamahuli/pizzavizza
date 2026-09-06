import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { ChatbotToggle } from '@/src/components/chatbot/chatbot-toggle';
import { ServiceWorkerCleanup } from '@/src/components/pwa/service-worker-cleanup';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { getSessionUser } from '@/src/auth/session';

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
      url: '/icon-512.png',
    },
    {
      rel: 'apple-touch-icon',
      url: '/icon-192.png',
    },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [settings, user] = await Promise.all([getRestaurantSettings().catch(() => null), getSessionUser().catch(() => null)]);
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ServiceWorkerCleanup />
        <ChatbotToggle enabled={settings?.chatbotEnabled ?? true} user={user ? { name: user.name, role: user.role } : null} restaurantName={settings?.restaurantName || 'Pizza Vizza'} />
        {children}
      </body>
    </html>
  );
}
