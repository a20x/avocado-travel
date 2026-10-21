import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { NewsForm } from '@/modules/news/ui';
import { dateInZone, timeInZone } from '@/shared/lib/time';

export const metadata: Metadata = { title: 'Новая новость — админка', robots: { index: false } };

export default async function NewNewsPage() {
  await requireAdmin('/admin/news/new');
  const now = new Date();

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin/news">← Все новости</Link>
      </p>
      <h1 className="text-3xl">Новая новость</h1>
      <NewsForm
        initial={{
          title: '',
          slug: '',
          summary: '',
          body: '',
          category: 'company',
          // По умолчанию — опубликовать сейчас.
          publishedDate: dateInZone(now, 'Europe/Moscow'),
          publishedTime: timeInZone(now, 'Europe/Moscow'),
        }}
      />
    </div>
  );
}
