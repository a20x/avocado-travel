import { catalogLinks, catalogSections } from '@/modules/catalog';
import type { Db } from './db';

// Каталог ресурсов (docs/04-data-model.md, «Демо-данные»): 5 разделов верхнего уровня
// (один скрыт — пример для админки), один подраздел и 20 ссылок на настоящие сайты.

type DemoLink = { title: string; url: string; description?: string; hidden?: boolean };
type DemoSection = {
  title: string;
  hidden?: boolean;
  links: DemoLink[];
  children?: DemoSection[];
};

// prettier-ignore
const CATALOG: DemoSection[] = [
  {
    title: 'Перед поездкой',
    links: [
      { title: 'Ростуризм', url: 'https://tourism.gov.ru/', description: 'Новости для туристов и рекомендации по странам.' },
      { title: 'Росавиация', url: 'https://favt.gov.ru/', description: 'Федеральное агентство воздушного транспорта.' },
      { title: 'Википутешествие', url: 'https://ru.wikivoyage.org/', description: 'Свободный путеводитель по городам и странам.' },
      { title: 'Яндекс Карты', url: 'https://yandex.ru/maps/' },
    ],
    children: [
      {
        title: 'Документы и визы',
        links: [
          { title: 'Госуслуги: загранпаспорт', url: 'https://www.gosuslugi.ru/', description: 'Оформить или заменить загранпаспорт онлайн.' },
          { title: 'МИД России', url: 'https://www.mid.ru/', description: 'Визовые требования и памятки для выезжающих за рубеж.' },
          { title: 'ФТС России', url: 'https://customs.gov.ru/', description: 'Правила ввоза и вывоза вещей и валюты.' },
        ],
      },
    ],
  },
  {
    title: 'Аэропорты',
    links: [
      { title: 'Шереметьево', url: 'https://www.svo.aero/', description: 'Онлайн-табло, терминалы и парковки.' },
      { title: 'Внуково', url: 'https://www.vnukovo.ru/' },
      { title: 'Домодедово', url: 'https://www.dme.ru/' },
      { title: 'Пулково', url: 'https://pulkovoairport.ru/' },
    ],
  },
  {
    title: 'Погода и время',
    links: [
      { title: 'Open-Meteo', url: 'https://open-meteo.com/', description: 'Открытые данные о погоде — их показывает и наш сайт.' },
      { title: 'Яндекс Погода', url: 'https://yandex.ru/pogoda/' },
      { title: 'Gismeteo', url: 'https://www.gismeteo.ru/' },
      { title: 'Time and Date', url: 'https://www.timeanddate.com/', description: 'Время в городах мира и часовые пояса.' },
    ],
  },
  {
    title: 'Деньги в поездке',
    links: [
      { title: 'Банк России: курсы валют', url: 'https://www.cbr.ru/currency_base/daily/', description: 'Официальные курсы — по ним считает наш конвертер.' },
      { title: 'Финансовая культура', url: 'https://fincult.info/', description: 'Как не потерять деньги в путешествии.' },
      { title: 'Карты «Мир»', url: 'https://mironline.ru/', description: 'Где за рубежом принимают карты «Мир».', hidden: true },
    ],
  },
  {
    title: 'Партнёры (черновик)',
    hidden: true,
    links: [
      { title: 'Пример партнёра', url: 'https://example.com/' },
      { title: 'Ещё один партнёр', url: 'https://example.org/' },
    ],
  },
];

async function insertSection(
  db: Db,
  section: DemoSection,
  parentId: number | null,
  position: number,
): Promise<number> {
  const [created] = await db
    .insert(catalogSections)
    .values({ title: section.title, parentId, position, isVisible: !section.hidden })
    .returning({ id: catalogSections.id });
  if (!created) throw new Error('Раздел не создан');
  if (section.links.length > 0) {
    await db.insert(catalogLinks).values(
      section.links.map((link, i) => ({
        sectionId: created.id,
        title: link.title,
        url: link.url,
        description: link.description ?? '',
        position: i + 1,
        isVisible: !link.hidden,
      })),
    );
  }
  let count = section.links.length;
  for (const [i, child] of (section.children ?? []).entries()) {
    count += await insertSection(db, child, created.id, i + 1);
  }
  return count;
}

export async function seedCatalog(db: Db): Promise<number> {
  let links = 0;
  for (const [i, section] of CATALOG.entries()) {
    links += await insertSection(db, section, null, i + 1);
  }
  return links;
}
