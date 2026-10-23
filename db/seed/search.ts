import { asc, eq } from 'drizzle-orm';
import { airlines, airports, groupCities } from '@/modules/catalog-data';
import { forumPosts, forumTopics, topicSearchDocument } from '@/modules/forum';
import { news, newsSearchDocument } from '@/modules/news';
import { searchDocuments, type SearchDocumentInput } from '@/modules/search';
import type { Db } from './db';

// Поисковый индекс (docs/04-data-model.md, «Поиск по сайту»). Новости и темы форума
// на сайте индексируют их сервисы при сохранении; демо-данные пишутся в базу напрямую,
// поэтому здесь индекс собирается заново теми же функциями модулей — плюс страницы сайта.

const page = (refId: string, url: string, title: string, body: string): SearchDocumentInput => ({
  kind: 'page',
  refId,
  url,
  title,
  body,
  visibleFrom: null,
});

// prettier-ignore
const STATIC_PAGES: SearchDocumentInput[] = [
  page('home', '/', 'Авиабилеты по России и за рубеж', 'Поиск рейсов одной фразой: откуда, куда, когда, сколько пассажиров и какой класс. Популярные направления из Москвы, специальные предложения, погода в городах, опрос и рейтинг сайта.'),
  page('destinations', '/destinations', 'Направления', 'Города, куда летают наши рейсы: Россия и зарубежье. Описание города, аэропорты, часовой пояс, погода и прямые рейсы.'),
  page('airlines', '/airlines', 'Авиакомпании', 'Сравнение авиакомпаний: маршруты, города, рейсы в неделю, флот и багаж в тарифе.'),
  page('services', '/services', 'Сервисы', 'Карта маршрутов с линиями перелётов, мировые часы и разница часовых поясов, календарь, конвертер валют по курсу ЦБ: доллар, евро, юань, лира, дирхам, драм, сум. Опрос посетителей.'),
  page('links', '/links', 'Полезные ссылки', 'Каталог ресурсов для путешественника: загранпаспорт, визы, таможня, сайты аэропортов, погода и время, курсы валют и деньги в поездке.'),
  page('news', '/news', 'Новости', 'Новости Avocado Travel: новые направления, акции, изменения в сервисе.'),
  page('forum', '/forum', 'Форум', 'Обсуждения путешественников: какое место выбрать в самолёте, сколько брать багажа, что посмотреть в городах.'),
  page('guestbook', '/guestbook', 'Гостевая книга', 'Отзывы и пожелания посетителей сайта. Оставить запись может любой, входить не нужно.'),
  page('booking', '/account', 'Личный кабинет', 'Мои заказы и билеты: код брони, статус оплаты, отмена брони. Места держатся 15 минут, оплата демонстрационная.'),
];

export async function seedSearch(db: Db): Promise<number> {
  const [airportRows, airlineRows, newsRows, topics] = await Promise.all([
    db.select().from(airports),
    db.select().from(airlines),
    db.select().from(news).where(eq(news.source, 'site')),
    db.select({ id: forumTopics.id, title: forumTopics.title }).from(forumTopics),
  ]);

  const cityPages = groupCities(airportRows).map((city) =>
    page(
      `city:${city.slug}`,
      `/destinations/${city.slug}`,
      `${city.name} — направление`,
      [
        city.description,
        `${city.country}. Аэропорты: ${city.airports.map((a) => `${a.name} (${a.iata})`).join(', ')}.`,
        `Авиабилеты в ${city.nameTo} и из ${city.nameFrom}.`,
      ].join(' '),
    ),
  );

  const airlinesPage = STATIC_PAGES.find((doc) => doc.refId === 'airlines');
  if (airlinesPage) {
    airlinesPage.body += ` ${airlineRows.map((a) => `${a.name}: ${a.description}`).join(' ')}`;
  }

  const forumDocs: SearchDocumentInput[] = [];
  for (const topic of topics) {
    const posts = await db
      .select({ body: forumPosts.body })
      .from(forumPosts)
      .where(eq(forumPosts.topicId, topic.id))
      .orderBy(asc(forumPosts.createdAt));
    forumDocs.push(
      topicSearchDocument(
        topic,
        posts.map((post) => post.body),
      ),
    );
  }

  const docs = [...STATIC_PAGES, ...cityPages, ...newsRows.map(newsSearchDocument), ...forumDocs];
  await db.insert(searchDocuments).values(docs);
  return docs.length;
}
