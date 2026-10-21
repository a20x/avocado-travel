import type { Metadata } from 'next';
import { listEntries } from '@/modules/guestbook/server';
import { EntryList, GuestbookForm } from '@/modules/guestbook/ui';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Pagination } from '@/shared/ui/Pagination';
import { Toast } from '@/shared/ui/Toast';

export const metadata: Metadata = {
  title: 'Гостевая книга',
  description: 'Отзывы и пожелания посетителей Avocado Travel.',
};

export default async function GuestbookPage(props: PageProps<'/guestbook'>) {
  const params = await props.searchParams;
  const { items, page, totalPages } = await listEntries({ page: params.page });

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="grid max-w-2xl gap-2">
        <h1 className="text-3xl">Гостевая книга</h1>
        <p className="text-slate">
          Расскажите, как слетали, что понравилось и что улучшить. Писать может любой посетитель —
          входить не нужно.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="entries-title" className="grid gap-4 lg:order-1">
          <h2 id="entries-title" className="sr-only">
            Записи посетителей
          </h2>
          {items.length > 0 ? (
            <EntryList entries={items} />
          ) : (
            <Card>
              <EmptyState
                image="/images/illustrations/no-results.svg"
                title="Записей пока нет"
                text="Станьте первым!"
              />
            </Card>
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            href={(p) => (p > 1 ? `/guestbook?page=${p}` : '/guestbook')}
          />
        </section>
        <div className="lg:sticky lg:top-4 lg:order-2">
          <GuestbookForm />
        </div>
      </div>

      {params.posted === 'visible' ? <Toast message="Спасибо! Запись опубликована." /> : null}
      {params.posted === 'moderation' ? (
        <Toast message="Спасибо! Запись появится после проверки модератором." />
      ) : null}
    </div>
  );
}
