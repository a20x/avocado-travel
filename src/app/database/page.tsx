import Link from 'next/link';
import { DB_REPORTS, type DbReport } from '@/modules/database';
import { getFlightCombos, getPassport, runDatabaseQuery } from '@/modules/database/server';
import { DbPassportCard, DbQueryForm, DbResultView, SqlBlock } from '@/modules/database/ui';
import { listAirlines, listCities } from '@/modules/catalog-data/server';
import { buttonClasses } from '@/shared/ui/Button';
import { Tabs } from '@/shared/ui/Tabs';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'База данных и запросы',
  description:
    'База данных Avocado Travel: паспорт базы и пять видов запросов — поиск рейсов, маршруты авиакомпаний, сводка продаж, динамика по месяцам и оценки сайта — с графиками и текстом SQL.',
  path: '/database',
});

/**
 * Вкладка «БД» (лаба 3): паспорт базы и пять видов запросов к ней. Запрос выбирается
 * вкладкой, условия — формой GET; под результатом — текст выполненного SQL.
 */
export default async function DatabasePage(props: PageProps<'/database'>) {
  const params = await props.searchParams;
  const [page, passport, combos, cities, airlines] = await Promise.all([
    runDatabaseQuery(params),
    getPassport(),
    getFlightCombos(),
    listCities(),
    listAirlines(),
  ]);
  const fetchedAt = new Date();
  const { query } = page;
  const secondary = buttonClasses({ variant: 'secondary' });

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="grid max-w-3xl gap-2">
        <h1 className="text-3xl">База данных и запросы</h1>
        <p className="text-slate">
          Найдите рейс, сравните авиакомпании и маршруты, посмотрите динамику продаж и то, как
          посетители оценивают сайт. Каждый результат — живой запрос к базе PostgreSQL.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin" className={buttonClasses()}>
          Ввод данных
        </Link>
        <a href="#about" className={secondary}>
          О базе данных
        </a>
        <Link href="/analytics" className={secondary}>
          Подробные отчёты о продажах
        </Link>
      </div>

      <DbPassportCard passport={passport} />

      <section aria-labelledby="queries-title" className="grid gap-4">
        <h2 id="queries-title" className="sr-only">
          Запросы к базе
        </h2>
        <Tabs
          label="Вид запроса"
          current={`/database?report=${query.report}`}
          items={(Object.keys(DB_REPORTS) as DbReport[]).map((report, index) => ({
            href: `/database?report=${report}`,
            label: `${index + 1}. ${DB_REPORTS[report]}`,
          }))}
        />
        <DbQueryForm
          query={query}
          combos={combos}
          cities={cities.map((city) => ({ value: city.slug, label: city.name }))}
          airlines={airlines.map((airline) => ({ value: airline.code, label: airline.name }))}
        />
        <DbResultView query={query} result={page.result} fetchedAt={fetchedAt} />
        <SqlBlock queries={page.sql} />
      </section>
    </div>
  );
}
