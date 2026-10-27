'use client';

// Клиентский компонент: на узком экране полосу вкладок надо прокрутить к текущей.
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/cn';

export type TabItem = { href: string; label: string };

type TabsProps = {
  items: TabItem[];
  /** Адрес текущей вкладки. */
  current: string;
  label: string;
};

/**
 * Вкладки-ссылки: каждая вкладка — отдельный адрес. Работают без JavaScript,
 * а текущая вкладка видна по ссылке (её можно сохранить и отправить).
 */
export function Tabs({ items, current, label }: TabsProps) {
  const nav = useRef<HTMLElement>(null);

  // На узком экране вкладки не помещаются, и текущая могла оказаться за краем полосы.
  // Прокручиваем саму полосу, а не страницу: scrollIntoView сдвинул бы и страницу.
  useEffect(() => {
    const strip = nav.current;
    const tab = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !tab || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft = tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2;
  }, [current]);

  return (
    // На узком экране вкладки прокручиваются вбок внутри полосы, страница не уезжает.
    <nav
      ref={nav}
      aria-label={label}
      className="relative flex gap-6 overflow-x-auto border-b border-line"
    >
      {items.map((item) => {
        const isCurrent = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isCurrent ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-[3px] px-1 py-2.5 font-medium whitespace-nowrap no-underline',
              isCurrent
                ? 'border-leaf text-leaf'
                : 'border-transparent text-slate hover:text-graphite',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
