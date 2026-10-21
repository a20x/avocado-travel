import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import { getNewsForEdit } from '@/modules/news/server';
import { NewsForm } from '@/modules/news/ui';

export const metadata: Metadata = { title: 'Правка новости — админка', robots: { index: false } };

export default async function EditNewsPage(props: PageProps<'/admin/news/[id]/edit'>) {
  const { id } = await props.params;
  await requireAdmin(`/admin/news/${id}/edit`);
  const item = await getNewsForEdit(id);
  if (!item) notFound();

  const { id: newsId, ...initial } = item;
  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin/news">← Все новости</Link>
      </p>
      <h1 className="text-3xl">Правка новости</h1>
      <NewsForm id={newsId} initial={initial} />
    </div>
  );
}
