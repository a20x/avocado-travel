import Link from 'next/link';
import {
  API_ENDPOINTS,
  API_RATE_LIMIT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/modules/exchange';
import { EndpointDoc } from '@/modules/exchange/ui';
import { searchFlights } from '@/modules/flights/server';
import { pageMetadata } from '@/shared/lib/metadata';
import { addDays, dateInZone } from '@/shared/lib/time';
import { Card } from '@/shared/ui/Card';

export const metadata = pageMetadata({
  title: 'API и выгрузки',
  description:
    'Публичный REST API Avocado Travel: аэропорты, авиакомпании, поиск рейсов, новости, статистика и аналитика в JSON. Спецификация OpenAPI и примеры запросов.',
  path: '/api/docs',
});

const TAGS = [...new Set(API_ENDPOINTS.map((endpoint) => endpoint.tag))];

export default async function ApiDocsPage() {
  const now = new Date();
  const today = dateInZone(now, 'Europe/Moscow');
  // Для примера «Рейс» нужен настоящий идентификатор — берём первый рейс из примера поиска.
  const sample = await searchFlights(
    { from: 'moscow', to: 'kaliningrad', date: addDays(today, 2) },
    now,
  );
  const sampleFlightId = sample.ok ? (sample.data.offers[0]?.id ?? '') : '';
  const exampleOf = (endpoint: (typeof API_ENDPOINTS)[number]) => {
    const example = endpoint.example(today);
    return endpoint.id === 'getFlight' ? { path: { id: sampleFlightId } } : example;
  };

  return (
    <div className="container-site grid gap-8 py-8">
      <header className="grid max-w-3xl gap-2">
        <h1 className="text-3xl">API и выгрузки</h1>
        <p className="text-slate">
          Данные сайта для других программ: справочники, поиск рейсов, новости, статистика посещений
          и отчёты аналитики в формате JSON. Только чтение, без регистрации и ключей.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-label="Адреса API" className="lg:sticky lg:top-4">
          <Card className="grid gap-3 p-4">
            <a href="#rules" className="font-semibold">
              Как устроен API
            </a>
            <a href="#downloads" className="font-semibold">
              Выгрузки и лента
            </a>
            {TAGS.map((tag) => (
              <div key={tag} className="grid gap-1">
                <p className="text-sm font-semibold text-slate">{tag}</p>
                <ul className="grid gap-1 text-sm">
                  {API_ENDPOINTS.filter((endpoint) => endpoint.tag === tag).map((endpoint) => (
                    <li key={endpoint.id}>
                      <a href={`#${endpoint.id}`}>{endpoint.summary}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>
        </nav>

        <div className="grid gap-8">
          <Card
            as="section"
            id="rules"
            aria-labelledby="rules-title"
            className="grid scroll-mt-4 gap-3 p-5 md:p-6"
          >
            <h2 id="rules-title" className="text-xl">
              Как устроен API
            </h2>
            <ul className="grid list-disc gap-2 pl-5">
              <li>
                Базовый адрес — <code>/api/v1</code>, все запросы — <code>GET</code>, ответы — JSON
                в кодировке UTF-8. Обращаться к API можно и со страниц других сайтов.
              </li>
              <li>
                Список приходит как{' '}
                <code>{'{ "data": [...], "meta": { "page", "pageSize", "total" } }'}</code>, один
                объект — как <code>{'{ "data": {...} }'}</code>. Страницы: <code>page</code> с 1 и{' '}
                <code>pageSize</code> — по умолчанию {DEFAULT_PAGE_SIZE}, не больше {MAX_PAGE_SIZE}.
              </li>
              <li>
                Ошибка: <code>{'{ "error": { "code", "message" } }'}</code> с кодом ответа 400
                (неверный параметр), 404 (не найдено), 429 (больше {API_RATE_LIMIT.limit} запросов в
                минуту с одного адреса) или 500.
              </li>
              <li>Деньги — целые копейки (520000 = 5 200 ₽), время — ISO 8601 в UTC.</li>
              <li>
                Полное описание для программ — спецификация{' '}
                <a href="/api/v1/openapi.json">OpenAPI 3.1</a>: её понимают Postman, Swagger Editor
                и генераторы клиентов.
              </li>
              <li>
                Данные учебные: авиакомпании выдуманные, продажи сгенерированы. Персональных данных
                API не отдаёт. Те же отчёты с графиками — на странице{' '}
                <Link href="/analytics">«Аналитика»</Link>.
              </li>
            </ul>
          </Card>

          <Card
            as="section"
            id="downloads"
            aria-labelledby="downloads-title"
            className="grid scroll-mt-4 gap-3 p-5 md:p-6"
          >
            <h2 id="downloads-title" className="text-xl">
              Выгрузки и лента
            </h2>
            <p className="text-slate">
              Таблицы для Excel и других программ: CSV в UTF-8, разделитель — точка с запятой,
              первая строка — названия столбцов. Тот же файл в JSON — с параметром{' '}
              <code>format=json</code>.
            </p>
            <ul className="grid gap-2">
              <li>
                <a href={`/api/v1/export/flights?format=csv&date=${today}`} download>
                  Расписание на сегодня (CSV)
                </a>{' '}
                — все рейсы сети с местным временем вылета и прилёта
              </li>
              <li>
                <a href="/api/v1/export/news?format=csv" download>
                  Новости (CSV)
                </a>
              </li>
              <li>
                <a href="/api/v1/export/analytics/revenue?format=csv" download>
                  Выручка по месяцам (CSV)
                </a>{' '}
                — остальные отчёты скачиваются на странице{' '}
                <Link href="/analytics">«Аналитика»</Link>
              </li>
              <li>
                <a href="/feed.json">Лента новостей /feed.json</a> — формат JSON Feed 1.1,
                JSON-аналог RSS: её можно добавить в программу-читалку новостей
              </li>
            </ul>
          </Card>

          {TAGS.map((tag, index) => (
            <section key={tag} aria-labelledby={`tag-${index}`} className="grid gap-4">
              <h2 id={`tag-${index}`} className="text-2xl">
                {tag}
              </h2>
              {API_ENDPOINTS.filter((endpoint) => endpoint.tag === tag).map((endpoint) => (
                <EndpointDoc key={endpoint.id} endpoint={endpoint} example={exampleOf(endpoint)} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
