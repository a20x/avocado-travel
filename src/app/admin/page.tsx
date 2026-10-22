import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { SignOutButton } from '@/modules/auth/ui';
import { Card } from '@/shared/ui/Card';

export const metadata: Metadata = { title: 'Админка', robots: { index: false } };

/** Разделы появляются вместе с модулями (docs/08-roadmap.md). */
type Section = { title: string; href?: string; description?: string; task?: string };

const SECTIONS: Section[] = [
  { title: 'Новости', href: '/admin/news', description: 'Написать, изменить, удалить' },
  {
    title: 'Гостевая книга',
    href: '/admin/guestbook',
    description: 'Модерация, запрещённые слова и хосты',
  },
  {
    title: 'Форум',
    href: '/forum',
    description: 'Удаление тем и сообщений — прямо на страницах форума',
  },
  { title: 'Статистика посещений', task: 'T-19' },
  { title: 'Каталог ресурсов', task: 'T-23' },
  { title: 'Реклама', task: 'T-24' },
];

export default async function AdminPage() {
  const admin = await requireAdmin();

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Админка</h1>
          <p className="text-slate">Вы вошли как {admin.email}</p>
        </div>
        <SignOutButton />
      </header>
      <section aria-labelledby="sections-title" className="grid gap-4">
        <h2 id="sections-title" className="text-xl">
          Разделы
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <li key={section.title}>
              <Card className="grid gap-1 p-5">
                {section.href ? (
                  <Link href={section.href} className="font-semibold">
                    {section.title}
                  </Link>
                ) : (
                  <span className="font-semibold">{section.title}</span>
                )}
                <span className="text-sm text-slate">
                  {section.description ?? `Появится в задаче ${section.task}`}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
