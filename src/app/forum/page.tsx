import type { Metadata } from 'next';
import Link from 'next/link';
import { listTopics } from '@/modules/forum/server';
import { TopicList } from '@/modules/forum/ui';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Pagination } from '@/shared/ui/Pagination';
import { Toast } from '@/shared/ui/Toast';

export const metadata: Metadata = {
  title: 'Форум',
  description: 'Форум Avocado Travel: обсуждения направлений, багажа и выбора мест.',
};

export default async function ForumPage(props: PageProps<'/forum'>) {
  const params = await props.searchParams;
  const { items, page, totalPages } = await listTopics({ page: params.page });

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid max-w-2xl gap-2">
          <h1 className="text-3xl">Форум</h1>
          <p className="text-slate">
            Спрашивайте и советуйте: куда слетать, что взять с собой, какое место выбрать. Читать
            может каждый, писать — после входа.
          </p>
        </div>
        <Link href="/forum/new" className={buttonClasses()}>
          Новая тема
        </Link>
      </header>

      {items.length > 0 ? (
        <TopicList topics={items} />
      ) : (
        <Card>
          <EmptyState
            image="/images/illustrations/no-results.svg"
            title="Тем пока нет"
            text="Начните первое обсуждение."
          />
        </Card>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        href={(p) => (p > 1 ? `/forum?page=${p}` : '/forum')}
      />

      {params.deleted === '1' ? <Toast message="Тема удалена." /> : null}
    </div>
  );
}
