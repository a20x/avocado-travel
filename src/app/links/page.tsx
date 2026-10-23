import { countLinks } from '@/modules/catalog';
import { getPublicCatalog } from '@/modules/catalog/server';
import { LinksCatalog } from '@/modules/catalog/ui';
import { plural } from '@/shared/lib/format';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'Полезные ссылки',
  description:
    'Каталог полезных ресурсов для путешественника: документы и визы, аэропорты, погода, деньги.',
  path: '/links',
});

export default async function LinksPage() {
  const tree = await getPublicCatalog();
  const total = countLinks(tree);

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="grid max-w-2xl gap-2">
        <h1 className="text-3xl">Полезные ссылки</h1>
        <p className="text-slate">
          Сайты, которые пригодятся перед поездкой и в пути
          {total > 0 ? ` — ${total} ${plural(total, ['ссылка', 'ссылки', 'ссылок'])}` : ''}. Мы не
          отвечаем за содержимое чужих сайтов.
        </p>
      </header>
      {tree.length > 0 ? (
        <LinksCatalog tree={tree} />
      ) : (
        <Card>
          <EmptyState
            image="/images/illustrations/no-results.svg"
            title="Каталог пока пуст"
            text="Ссылки скоро появятся."
          />
        </Card>
      )}
    </div>
  );
}
