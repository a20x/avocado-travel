import type { Metadata } from 'next';
import { SEARCH_KINDS, describeQuery, type SearchKind } from '@/modules/search';
import { searchSite } from '@/modules/search/server';
import { SearchHelp, SearchHits } from '@/modules/search/ui';
import { plural } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Pagination } from '@/shared/ui/Pagination';
import { Tabs } from '@/shared/ui/Tabs';

export const metadata: Metadata = {
  title: 'Поиск по сайту',
  description: 'Поиск по страницам, новостям и форуму Avocado Travel с операторами И, ИЛИ, НЕ.',
  // Страницы результатов поисковикам не нужны — у каждого запроса своя.
  robots: { index: false, follow: true },
};

/** Адрес результатов: вид документов и страница — только если не по умолчанию. */
function searchHref(q: string, kind?: SearchKind, page = 1): string {
  const params = new URLSearchParams({ q });
  if (kind) params.set('kind', kind);
  if (page > 1) params.set('page', String(page));
  return `/search?${params}`;
}

export default async function SearchPage(props: PageProps<'/search'>) {
  const params = await props.searchParams;
  const q = typeof params.q === 'string' ? params.q.slice(0, 300) : '';
  const { parsed, kind, results } = await searchSite(params);

  return (
    <div className="container-site grid max-w-4xl gap-6 py-8">
      <h1 className="text-3xl">Поиск по сайту</h1>

      {/* Обычная форма GET: запрос — в адресе, результатом можно поделиться ссылкой. */}
      <form action="/search" role="search" className="flex flex-wrap items-end gap-3">
        <Input
          name="q"
          type="search"
          label="Что ищем"
          defaultValue={q}
          placeholder="например: багаж ИЛИ ручная кладь"
          className="min-w-0 flex-1"
        />
        <Button type="submit">Найти</Button>
      </form>
      <SearchHelp />

      {results === null ? (
        q.trim() ? (
          <p role="alert" className="rounded-sm bg-warning-bg px-4 py-3 text-warning">
            В запросе нет слов, которые нужно найти. Добавьте хотя бы одно слово без «НЕ».
          </p>
        ) : null
      ) : (
        <section aria-labelledby="results-title" className="grid gap-4">
          <div className="grid gap-1">
            <h2 id="results-title" className="text-xl">
              {results.counts.all > 0
                ? `Найдено ${results.counts.all} ${plural(results.counts.all, ['результат', 'результата', 'результатов'])}`
                : 'Ничего не нашлось'}
            </h2>
            <p className="text-sm text-slate">Ищем: {describeQuery(parsed)}</p>
          </div>
          {results.counts.all > 0 ? (
            <>
              <Tabs
                label="Что показывать"
                current={searchHref(q, kind)}
                items={[
                  { href: searchHref(q), label: `Всё · ${results.counts.all}` },
                  ...(Object.keys(SEARCH_KINDS) as SearchKind[]).map((key) => ({
                    href: searchHref(q, key),
                    label: `${SEARCH_KINDS[key]} · ${results.counts[key]}`,
                  })),
                ]}
              />
              {results.hits.length > 0 ? (
                <SearchHits hits={results.hits} />
              ) : (
                <p className="text-slate">В этом разделе по запросу ничего нет.</p>
              )}
              <Pagination
                page={results.page}
                totalPages={results.totalPages}
                href={(p) => searchHref(q, kind, p)}
              />
            </>
          ) : (
            <Card>
              <EmptyState
                image="/images/illustrations/no-results.svg"
                title="Ничего не нашлось"
                text="Проверьте написание или уберите часть слов. Подсказка по операторам — выше."
              />
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
