import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { ChatbotToggle } from '@/src/components/chatbot/chatbot-toggle';
import { ImageDownloadProtection } from '@/src/components/image-download-protection';
import { ServiceWorkerCleanup } from '@/src/components/pwa/service-worker-cleanup';
import { getRestaurantSettingsForRender } from '@/src/models/restaurant-settings';
import { getSessionUserForRender } from '@/src/auth/session';
import { SiteAnimationScope } from '@/src/components/site-animation-scope';
import { defaultSiteAnimations, normalizeSiteAnimations } from '@/src/types/site-animations';
import type { CSSProperties } from 'react';

export const dynamic = 'force-dynamic';

export const viewport = {
  themeColor: '#f59e0b',
};

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'Pizza Vizza',
  description: 'Pizza Vizza online ordering and private dining',
  keywords: ['pizza', 'restaurant', 'delivery', 'admin'],
  other: {
    'google-adsense-account': 'ca-pub-9052453172321926',
  },
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

function getThemeContrastColor(hex: string) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const luminanceChannels = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = (luminanceChannels[0] ?? 0) * 0.2126 + (luminanceChannels[1] ?? 0) * 0.7152 + (luminanceChannels[2] ?? 0) * 0.0722;
  return luminance > 0.179 ? '#171717' : '#ffffff';
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [settings, user] = await Promise.all([getRestaurantSettingsForRender().catch(() => null), getSessionUserForRender().catch(() => null)]);
  const themeColor = normalizeSiteAnimations(settings?.siteAnimations).themeColor;
  const hasCustomThemeColor = themeColor.toLowerCase() !== defaultSiteAnimations.themeColor;
  const themeStyle = {
    '--site-theme-primary': themeColor,
    '--site-theme-contrast': getThemeContrastColor(themeColor),
  } as CSSProperties;
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col"
        data-site-theme-custom={hasCustomThemeColor ? 'true' : undefined}
        style={themeStyle}
      >
        <SiteAnimationScope animations={settings?.siteAnimations} restaurantName={settings?.restaurantName} restaurantLogo={settings?.logo}>
          <ServiceWorkerCleanup />
          <ImageDownloadProtection />
          <ChatbotToggle enabled={settings?.chatbotEnabled ?? true} user={user ? { name: user.name, role: user.role } : null} restaurantName={settings?.restaurantName || 'Pizza Vizza'} />
          {children}
        </SiteAnimationScope>
      </body>
    </html>
  );
}
