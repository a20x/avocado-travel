import Link from 'next/link';
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
  return (
    <nav aria-label={label} className="flex gap-6 border-b border-line">
      {items.map((item) => {
        const isCurrent = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isCurrent ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-[3px] px-1 py-2.5 font-medium no-underline',
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
