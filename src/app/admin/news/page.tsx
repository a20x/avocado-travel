import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { NEWS_CATEGORIES, isNewsCategory } from '@/modules/news';
import { listNewsForAdmin } from '@/modules/news/server';
import { DeleteNewsButton, newsDate } from '@/modules/news/ui';
import { Badge } from '@/shared/ui/Badge';
import { buttonClasses } from '@/shared/ui/Button';
import { Pagination } from '@/shared/ui/Pagination';
import { Table } from '@/shared/ui/Table';
import { Toast } from '@/shared/ui/Toast';

export const metadata: Metadata = { title: 'Новости — админка', robots: { index: false } };

export default async function AdminNewsPage(props: PageProps<'/admin/news'>) {
  await requireAdmin('/admin/news');
  const params = await props.searchParams;
  const { items, page, totalPages } = await listNewsForAdmin({ page: params.page });
  const now = new Date();

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin">← Админка</Link>
      </p>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">Новости</h1>
        <Link href="/admin/news/new" className={buttonClasses()}>
          Написать новость
        </Link>
      </header>

      <Table caption="Новости сайта, свежие сверху">
        <thead>
          <tr>
            <th scope="col">Заголовок</th>
            <th scope="col">Рубрика</th>
            <th scope="col">Дата</th>
            <th scope="col">
              <span className="sr-only">Действия</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="min-w-64">
                {item.publishedAt > now ? (
                  <span className="mr-2">
                    <Badge tone="warning">запланирована</Badge>
                  </span>
                ) : null}
                {item.publishedAt <= now ? (
                  <Link href={`/news/${item.slug}`}>{item.title}</Link>
                ) : (
                  item.title
                )}
              </td>
              <td className="whitespace-nowrap">
                {isNewsCategory(item.category) ? NEWS_CATEGORIES[item.category] : item.category}
              </td>
              <td className="whitespace-nowrap">{newsDate(item.publishedAt)}</td>
              <td>
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <Link
                    href={`/admin/news/${item.id}/edit`}
                    className={buttonClasses({ variant: 'ghost' })}
                  >
                    Изменить<span className="sr-only">: {item.title}</span>
                  </Link>
                  <DeleteNewsButton id={item.id} title={item.title} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination
        page={page}
        totalPages={totalPages}
        href={(p) => (p > 1 ? `/admin/news?page=${p}` : '/admin/news')}
      />

      {params.saved ? <Toast message="Новость сохранена." /> : null}
      {params.deleted ? <Toast message="Новость удалена." /> : null}
    </div>
  );
}
