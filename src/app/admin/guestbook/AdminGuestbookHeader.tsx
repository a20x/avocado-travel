import Link from 'next/link';
import { Tabs } from '@/shared/ui/Tabs';

/** Шапка раздела гостевой книги в админке: две вкладки. */
export function AdminGuestbookHeader({ current }: { current: string }) {
  return (
    <>
      <p>
        <Link href="/admin">← Админка</Link>
      </p>
      <h1 className="text-3xl">Гостевая книга</h1>
      <Tabs
        label="Разделы гостевой книги"
        current={current}
        items={[
          { href: '/admin/guestbook', label: 'Записи' },
          { href: '/admin/guestbook/rules', label: 'Запреты' },
        ]}
      />
    </>
  );
}
