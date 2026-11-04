import Link from 'next/link';
import {
  DB_REPORTS,
  DB_SECTIONS,
  isReport,
  sectionHref,
  sectionOf,
  type DbView,
} from '@/modules/database';
import { getCurrentUser } from '@/modules/auth/server';
import { getFlightCombos, getPassport, runDatabaseQuery } from '@/modules/database/server';
import {
  DbInputCard,
  DbPassportCard,
  DbQueryForm,
  DbResultView,
  SqlBlock,
} from '@/modules/database/ui';
import { listAirlines, listCities } from '@/modules/catalog-data/server';
import { Tabs } from '@/shared/ui/Tabs';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'База данных: ввод, поиск, агрегация',
  description:
    'База данных Avocado Travel: ввод данных, поиск по одному и по двум атрибутам, агрегация с графиками, сведения о базе и поиск рейсов — с текстом выполненного SQL.',
  path: '/database',
});

const viewHref = (view: DbView) => `/database?report=${view}`;

/**
 * Вкладка «БД» (лаба 3). Меню — словами преподавателя: ввод, поиск по одному атрибуту, по двум,
 * агрегация, сведения о БД и поиск рейсов. Раздел выбирается пунктом меню, условия запроса —
 * формой GET; под результатом — текст выполненного SQL.
 */
export default async function DatabasePage(props: PageProps<'/database'>) {
  const params = await props.searchParams;
  const page = await runDatabaseQuery(params);
  const { query, result } = page;
  const view = query.report;
  const section = sectionOf(view);

  // Каждому разделу — только свои данные: списки форм, паспорт или пользователь.
  const linked = view === 'flights' || view === 'routes';
  const [passport, user, combos, cities, airlines] = await Promise.all([
    view === 'about' ? getPassport() : null,
    view === 'input' || view === 'airline' || view === 'flights' ? getCurrentUser() : null,
    linked ? getFlightCombos() : [],
    linked ? listCities() : [],
    linked || view === 'months' ? listAirlines() : [],
  ]);

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="grid max-w-3xl gap-2">
        <h1 className="text-3xl">База данных</h1>
        <p className="text-slate">
          Ввод данных, поиск по одному и по двум атрибутам, агрегированные данные с графиками и
          сведения о базе PostgreSQL. Каждый результат — живой запрос к базе, его SQL — под
          результатом.
        </p>
      </header>

      <Tabs
        label="Разделы базы данных"
        current={sectionHref(section)}
        items={DB_SECTIONS.map((item) => ({ href: sectionHref(item), label: item.label }))}
      />

      {view === 'input' ? <DbInputCard isAdmin={user?.role === 'admin'} /> : null}
      {passport ? <DbPassportCard passport={passport} /> : null}

      {isReport(view) && result ? (
        <section aria-labelledby="query-title" className="grid gap-4">
          <h2 id="query-title" className="sr-only">
            {section.label}
          </h2>
          {section.views.length > 1 ? (
            // Сетка, а не flex: полоса вкладок на узком экране прокручивается внутри себя.
            <div className="grid gap-2">
              <Tabs
                label="Вид агрегации"
                current={viewHref(view)}
                items={section.views.filter(isReport).map((item) => ({
                  href: viewHref(item),
                  label: DB_REPORTS[item],
                }))}
              />
              <p>
                <Link href="/analytics">Подробные отчёты о продажах →</Link>
              </p>
            </div>
          ) : null}
          <DbQueryForm
            report={view}
            query={query}
            combos={combos}
            cities={cities.map((city) => ({ value: city.slug, label: city.name }))}
            airlines={airlines.map((airline) => ({ value: airline.code, label: airline.name }))}
            flightAirlines={result.report === 'airline' ? result.airlines : []}
            salesSpans={page.salesSpans}
          />
          <DbResultView
            query={query}
            result={result}
            fetchedAt={new Date()}
            isAdmin={user?.role === 'admin'}
          />
          <SqlBlock queries={page.sql} />
        </section>
      ) : null}
    </div>
  );
}
