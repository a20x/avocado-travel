import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getMetrikaId } from '@/modules/stats/server';
import { YandexMetrika } from '@/modules/stats/ui';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/shared/config/site';
import { OPEN_GRAPH_DEFAULTS } from '@/shared/lib/metadata';
import { SiteFooter } from './_components/SiteFooter';
import { SiteHeader } from './_components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  // Относительные адреса в метаданных (og:url, og:image) становятся абсолютными от адреса сайта.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Ермаков Александр' }],
  // Страницы без своих метаданных (вход, кабинет, админка) получают общий Open Graph.
  openGraph: { ...OPEN_GRAPH_DEFAULTS, title: SITE_NAME, description: SITE_DESCRIPTION },
  icons: {
    icon: { url: '/images/brand/favicon.svg', type: 'image/svg+xml' },
    apple: '/images/brand/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const metrikaId = getMetrikaId();
  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col">
        {/* Для тех, кто ходит по сайту клавиатурой: сразу к содержимому, минуя меню. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-white focus:px-4 focus:py-2"
        >
          Перейти к содержимому
        </a>
        <SiteHeader />
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        {metrikaId ? <YandexMetrika id={metrikaId} /> : null}
      </body>
    </html>
  );
}
