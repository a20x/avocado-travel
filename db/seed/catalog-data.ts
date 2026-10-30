import { aircraftModels, airlines, airports, cities } from '@/modules/catalog-data';
import type { Db } from './db';

type NewCity = typeof cities.$inferInsert;
type NewAirport = typeof airports.$inferInsert;
type NewAirline = typeof airlines.$inferInsert;
type NewAircraftModel = typeof aircraftModels.$inferInsert;

const RU = 'Россия';

// Города сети: названия с падежными формами для поиска-фразы («из Москвы в Казань») и описания
// для страниц направлений. У каждого есть иллюстрация public/images/destinations/<slug>.svg.
// Новые города администратор заводит в админке (/admin/cities).
// prettier-ignore
const CITIES: NewCity[] = [
  { slug: 'moscow', name: 'Москва', nameFrom: 'Москвы', nameTo: 'Москву', country: RU, image: '/images/destinations/moscow.svg', description: 'Столица и главный узел нашей сети: отсюда есть прямые рейсы во все города. Три аэропорта — Шереметьево, Внуково и Домодедово, поэтому при покупке билета стоит смотреть, из какого именно вылетает рейс.' },
  { slug: 'saint-petersburg', name: 'Санкт-Петербург', nameFrom: 'Санкт-Петербурга', nameTo: 'Санкт-Петербург', country: RU, image: '/images/destinations/saint-petersburg.svg', description: 'Город белых ночей, разводных мостов и Эрмитажа. Пулково — второй по числу рейсов аэропорт сети: прямые перелёты в крупные города России и за рубеж.' },
  { slug: 'kaliningrad', name: 'Калининград', nameFrom: 'Калининграда', nameTo: 'Калининград', country: RU, image: '/images/destinations/kaliningrad.svg', description: 'Самый западный регион страны: Балтийское море, Куршская коса и янтарь. Из-за расположения добраться сюда проще всего самолётом.' },
  { slug: 'sochi', name: 'Сочи', nameFrom: 'Сочи', nameTo: 'Сочи', country: RU, image: '/images/destinations/sochi.svg', description: 'Курорт на два сезона: летом — море, зимой — горнолыжная Красная Поляна. Рейсы в Сочи есть почти из всех городов сети.' },
  { slug: 'kazan', name: 'Казань', nameFrom: 'Казани', nameTo: 'Казань', country: RU, image: '/images/destinations/kazan.svg', description: 'Столица Татарстана, где рядом стоят мечеть Кул-Шариф и Благовещенский собор. Удобна для поездки на выходные: из Москвы лететь меньше двух часов.' },
  { slug: 'vladivostok', name: 'Владивосток', nameFrom: 'Владивостока', nameTo: 'Владивосток', country: RU, image: '/images/destinations/vladivostok.svg', description: 'Город на берегу Тихого океана в конце Транссиба. Самый дальний город сети внутри страны — девять часов полёта из Москвы.' },
  { slug: 'yekaterinburg', name: 'Екатеринбург', nameFrom: 'Екатеринбурга', nameTo: 'Екатеринбург', country: RU, image: '/images/destinations/yekaterinburg.svg', description: 'Столица Урала на границе Европы и Азии. Деловой город с конструктивистской архитектурой и прямыми рейсами в Сочи и Дубай.' },
  { slug: 'novosibirsk', name: 'Новосибирск', nameFrom: 'Новосибирска', nameTo: 'Новосибирск', country: RU, image: '/images/destinations/novosibirsk.svg', description: 'Крупнейший город Сибири и пересадочный узел на востоке сети. Отсюда летают в Пекин, Ташкент и соседние сибирские города.' },
  { slug: 'samara', name: 'Самара', nameFrom: 'Самары', nameTo: 'Самару', country: RU, image: '/images/destinations/samara.svg', description: 'Волжский город с самой длинной в стране набережной. Рейсы в Москву каждый день и в Сочи несколько раз в неделю.' },
  { slug: 'ufa', name: 'Уфа', nameFrom: 'Уфы', nameTo: 'Уфу', country: RU, image: '/images/destinations/ufa.svg', description: 'Столица Башкортостана на высоком берегу реки Белой. Рядом — Уральские горы и десятки озёр.' },
  { slug: 'krasnoyarsk', name: 'Красноярск', nameFrom: 'Красноярска', nameTo: 'Красноярск', country: RU, image: '/images/destinations/krasnoyarsk.svg', description: 'Город на Енисее рядом с заповедником «Столбы». Прямые рейсы в Москву, Новосибирск и Иркутск.' },
  { slug: 'irkutsk', name: 'Иркутск', nameFrom: 'Иркутска', nameTo: 'Иркутск', country: RU, image: '/images/destinations/irkutsk.svg', description: 'Ворота к Байкалу: до озера около часа на машине. Связан рейсами с Москвой, Красноярском и Владивостоком.' },
  { slug: 'mineralnye-vody', name: 'Минеральные Воды', nameFrom: 'Минеральных Вод', nameTo: 'Минеральные Воды', country: RU, image: '/images/destinations/mineralnye-vody.svg', description: 'Воздушные ворота Кавказских Минеральных Вод — Пятигорска, Кисловодска и Ессентуков. Сюда едут на лечение и в горы.' },
  { slug: 'istanbul', name: 'Стамбул', nameFrom: 'Стамбула', nameTo: 'Стамбул', country: 'Турция', image: '/images/destinations/istanbul.svg', description: 'Город на двух континентах по берегам Босфора. Летаем из Москвы, Санкт-Петербурга и Казани.' },
  { slug: 'dubai', name: 'Дубай', nameFrom: 'Дубая', nameTo: 'Дубай', country: 'ОАЭ', image: '/images/destinations/dubai.svg', description: 'Небоскрёбы, пустыня и тёплое море круглый год. Самый популярный зарубежный курорт в нашей сети.' },
  { slug: 'yerevan', name: 'Ереван', nameFrom: 'Еревана', nameTo: 'Ереван', country: 'Армения', image: '/images/destinations/yerevan.svg', description: 'Один из древнейших городов мира с видом на Арарат. Перелёт из Москвы — около трёх часов.' },
  { slug: 'tashkent', name: 'Ташкент', nameFrom: 'Ташкента', nameTo: 'Ташкент', country: 'Узбекистан', image: '/images/destinations/tashkent.svg', description: 'Столица Узбекистана: восточные базары, голубые купола и плов. Отсюда удобно ехать в Самарканд и Бухару.' },
  { slug: 'beijing', name: 'Пекин', nameFrom: 'Пекина', nameTo: 'Пекин', country: 'Китай', image: '/images/destinations/beijing.svg', description: 'Столица Китая: Запретный город, храм Неба и Великая стена в часе езды. Летаем из Москвы и Новосибирска.' },
];

// 15 российских и 5 зарубежных аэропортов (docs/04-data-model.md); город — по citySlug.
// prettier-ignore
const AIRPORTS: NewAirport[] = [
  { iata: 'SVO', name: 'Шереметьево', citySlug: 'moscow', lat: 55.9726, lon: 37.4146, timezone: 'Europe/Moscow' },
  { iata: 'VKO', name: 'Внуково', citySlug: 'moscow', lat: 55.5915, lon: 37.2615, timezone: 'Europe/Moscow' },
  { iata: 'DME', name: 'Домодедово', citySlug: 'moscow', lat: 55.4088, lon: 37.9063, timezone: 'Europe/Moscow' },
  { iata: 'LED', name: 'Пулково', citySlug: 'saint-petersburg', lat: 59.8003, lon: 30.2625, timezone: 'Europe/Moscow' },
  { iata: 'KGD', name: 'Храброво', citySlug: 'kaliningrad', lat: 54.89, lon: 20.5926, timezone: 'Europe/Kaliningrad' },
  { iata: 'AER', name: 'Сочи', citySlug: 'sochi', lat: 43.4499, lon: 39.9566, timezone: 'Europe/Moscow' },
  { iata: 'KZN', name: 'Казань', citySlug: 'kazan', lat: 55.6062, lon: 49.2787, timezone: 'Europe/Moscow' },
  { iata: 'VVO', name: 'Кневичи', citySlug: 'vladivostok', lat: 43.399, lon: 132.148, timezone: 'Asia/Vladivostok' },
  { iata: 'SVX', name: 'Кольцово', citySlug: 'yekaterinburg', lat: 56.7431, lon: 60.8027, timezone: 'Asia/Yekaterinburg' },
  { iata: 'OVB', name: 'Толмачёво', citySlug: 'novosibirsk', lat: 55.0126, lon: 82.6507, timezone: 'Asia/Novosibirsk' },
  { iata: 'KUF', name: 'Курумоч', citySlug: 'samara', lat: 53.5049, lon: 50.1643, timezone: 'Europe/Samara' },
  { iata: 'UFA', name: 'Уфа', citySlug: 'ufa', lat: 54.5575, lon: 55.8744, timezone: 'Asia/Yekaterinburg' },
  { iata: 'KJA', name: 'Емельяново', citySlug: 'krasnoyarsk', lat: 56.1729, lon: 92.4933, timezone: 'Asia/Krasnoyarsk' },
  { iata: 'IKT', name: 'Иркутск', citySlug: 'irkutsk', lat: 52.268, lon: 104.389, timezone: 'Asia/Irkutsk' },
  { iata: 'MRV', name: 'Минеральные Воды', citySlug: 'mineralnye-vody', lat: 44.2251, lon: 43.0819, timezone: 'Europe/Moscow' },
  { iata: 'IST', name: 'Стамбул', citySlug: 'istanbul', lat: 41.2753, lon: 28.7519, timezone: 'Europe/Istanbul' },
  { iata: 'DXB', name: 'Дубай', citySlug: 'dubai', lat: 25.2532, lon: 55.3657, timezone: 'Asia/Dubai' },
  { iata: 'EVN', name: 'Звартноц', citySlug: 'yerevan', lat: 40.1473, lon: 44.3959, timezone: 'Asia/Yerevan' },
  { iata: 'TAS', name: 'Ташкент', citySlug: 'tashkent', lat: 41.2579, lon: 69.2812, timezone: 'Asia/Tashkent' },
  { iata: 'PEK', name: 'Шоуду', citySlug: 'beijing', lat: 40.0799, lon: 116.6031, timezone: 'Asia/Shanghai' },
];

// Авиакомпании выдуманные: названия, коды и цвета — из public/images/README.md.
// prettier-ignore
const AIRLINES: NewAirline[] = [
  { code: 'LST', name: 'Ластавиа', color: '#2E4A7D', logo: '/images/airlines/lastavia.svg', baggageIncluded: false, description: 'Крупнейший перевозчик сети: частые рейсы между Москвой и городами-миллионниками.' },
  { code: 'ORN', name: 'Орнавиа', color: '#9A4A2E', logo: '/images/airlines/ornavia.svg', baggageIncluded: false, description: 'Недорогие перелёты на юг и в столицы соседних стран.' },
  { code: 'ARL', name: 'Аэрелла', color: '#5B4B8A', logo: '/images/airlines/aerella.svg', baggageIncluded: false, description: 'Региональная авиакомпания: прямые рейсы между городами Урала и Поволжья.' },
  { code: 'STV', name: 'Стрива', color: '#1F6F6A', logo: '/images/airlines/striva.svg', baggageIncluded: false, description: 'Быстрые короткие рейсы на современных узкофюзеляжных самолётах.' },
  { code: 'KRR', name: 'Кирра', color: '#3B78A0', logo: '/images/airlines/kirra.svg', baggageIncluded: true, description: 'Багаж 23 кг включён в эконом на всех рейсах.' },
  { code: 'ALT', name: 'Альтэйра', color: '#A87B22', logo: '/images/airlines/altaira.svg', baggageIncluded: true, description: 'Дальние перелёты на широкофюзеляжных самолётах: Сибирь, Дальний Восток, Азия.' },
];

// Схема ряда: буквы кресел, дефис — проход (см. src/modules/catalog-data/cabin.ts).
// prettier-ignore
const AIRCRAFT_MODELS: NewAircraftModel[] = [
  { manufacturer: 'Airbus', model: 'A320neo', businessRows: 3, businessLayout: 'AC-DF', economyRows: 24, economyLayout: 'ABC-DEF' },
  { manufacturer: 'Airbus', model: 'A321neo', businessRows: 4, businessLayout: 'AC-DF', economyRows: 28, economyLayout: 'ABC-DEF' },
  { manufacturer: 'Boeing', model: '737-800', businessRows: 2, businessLayout: 'AC-DF', economyRows: 27, economyLayout: 'ABC-DEF' },
  { manufacturer: 'Boeing', model: '777-300ER', businessRows: 8, businessLayout: 'AC-DG-HK', economyRows: 38, economyLayout: 'ABC-DEFG-HJK' },
  { manufacturer: 'Sukhoi', model: 'Superjet 100', businessRows: 3, businessLayout: 'AC-DF', economyRows: 18, economyLayout: 'AC-DEF' },
];

/** Вставляет справочники и возвращает строки с id — на них ссылаются рейсы. */
export async function seedCatalogData(db: Db) {
  // Города — первыми: на них ссылаются аэропорты.
  const cityRows = await db.insert(cities).values(CITIES).returning();
  return {
    cities: cityRows,
    airports: await db.insert(airports).values(AIRPORTS).returning(),
    airlines: await db.insert(airlines).values(AIRLINES).returning(),
    aircraftModels: await db.insert(aircraftModels).values(AIRCRAFT_MODELS).returning(),
  };
}
