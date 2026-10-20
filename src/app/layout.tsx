import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteFooter } from './_components/SiteFooter';
import { SiteHeader } from './_components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Avocado Travel',
    template: '%s — Avocado Travel',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
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
      </body>
    </html>
  );
}
