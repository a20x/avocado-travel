import { aircraftModels, airlines, airports } from '@/modules/catalog-data';
import type { Db } from './db';

type NewAirport = typeof airports.$inferInsert;
type NewAirline = typeof airlines.$inferInsert;
type NewAircraftModel = typeof aircraftModels.$inferInsert;

const RU = 'Россия';

// 15 российских и 5 зарубежных аэропортов (docs/04-data-model.md). У каждого города
// есть иллюстрация public/images/destinations/<city_slug>.svg.
// prettier-ignore
const AIRPORTS: NewAirport[] = [
  { iata: 'SVO', name: 'Шереметьево', city: 'Москва', citySlug: 'moscow', country: RU, lat: 55.9726, lon: 37.4146, timezone: 'Europe/Moscow' },
  { iata: 'VKO', name: 'Внуково', city: 'Москва', citySlug: 'moscow', country: RU, lat: 55.5915, lon: 37.2615, timezone: 'Europe/Moscow' },
  { iata: 'DME', name: 'Домодедово', city: 'Москва', citySlug: 'moscow', country: RU, lat: 55.4088, lon: 37.9063, timezone: 'Europe/Moscow' },
  { iata: 'LED', name: 'Пулково', city: 'Санкт-Петербург', citySlug: 'saint-petersburg', country: RU, lat: 59.8003, lon: 30.2625, timezone: 'Europe/Moscow' },
  { iata: 'KGD', name: 'Храброво', city: 'Калининград', citySlug: 'kaliningrad', country: RU, lat: 54.89, lon: 20.5926, timezone: 'Europe/Kaliningrad' },
  { iata: 'AER', name: 'Сочи', city: 'Сочи', citySlug: 'sochi', country: RU, lat: 43.4499, lon: 39.9566, timezone: 'Europe/Moscow' },
  { iata: 'KZN', name: 'Казань', city: 'Казань', citySlug: 'kazan', country: RU, lat: 55.6062, lon: 49.2787, timezone: 'Europe/Moscow' },
  { iata: 'VVO', name: 'Кневичи', city: 'Владивосток', citySlug: 'vladivostok', country: RU, lat: 43.399, lon: 132.148, timezone: 'Asia/Vladivostok' },
  { iata: 'SVX', name: 'Кольцово', city: 'Екатеринбург', citySlug: 'yekaterinburg', country: RU, lat: 56.7431, lon: 60.8027, timezone: 'Asia/Yekaterinburg' },
  { iata: 'OVB', name: 'Толмачёво', city: 'Новосибирск', citySlug: 'novosibirsk', country: RU, lat: 55.0126, lon: 82.6507, timezone: 'Asia/Novosibirsk' },
  { iata: 'KUF', name: 'Курумоч', city: 'Самара', citySlug: 'samara', country: RU, lat: 53.5049, lon: 50.1643, timezone: 'Europe/Samara' },
  { iata: 'UFA', name: 'Уфа', city: 'Уфа', citySlug: 'ufa', country: RU, lat: 54.5575, lon: 55.8744, timezone: 'Asia/Yekaterinburg' },
  { iata: 'KJA', name: 'Емельяново', city: 'Красноярск', citySlug: 'krasnoyarsk', country: RU, lat: 56.1729, lon: 92.4933, timezone: 'Asia/Krasnoyarsk' },
  { iata: 'IKT', name: 'Иркутск', city: 'Иркутск', citySlug: 'irkutsk', country: RU, lat: 52.268, lon: 104.389, timezone: 'Asia/Irkutsk' },
  { iata: 'MRV', name: 'Минеральные Воды', city: 'Минеральные Воды', citySlug: 'mineralnye-vody', country: RU, lat: 44.2251, lon: 43.0819, timezone: 'Europe/Moscow' },
  { iata: 'IST', name: 'Стамбул', city: 'Стамбул', citySlug: 'istanbul', country: 'Турция', lat: 41.2753, lon: 28.7519, timezone: 'Europe/Istanbul' },
  { iata: 'DXB', name: 'Дубай', city: 'Дубай', citySlug: 'dubai', country: 'ОАЭ', lat: 25.2532, lon: 55.3657, timezone: 'Asia/Dubai' },
  { iata: 'EVN', name: 'Звартноц', city: 'Ереван', citySlug: 'yerevan', country: 'Армения', lat: 40.1473, lon: 44.3959, timezone: 'Asia/Yerevan' },
  { iata: 'TAS', name: 'Ташкент', city: 'Ташкент', citySlug: 'tashkent', country: 'Узбекистан', lat: 41.2579, lon: 69.2812, timezone: 'Asia/Tashkent' },
  { iata: 'PEK', name: 'Шоуду', city: 'Пекин', citySlug: 'beijing', country: 'Китай', lat: 40.0799, lon: 116.6031, timezone: 'Asia/Shanghai' },
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
  return {
    airports: await db.insert(airports).values(AIRPORTS).returning(),
    airlines: await db.insert(airlines).values(AIRLINES).returning(),
    aircraftModels: await db.insert(aircraftModels).values(AIRCRAFT_MODELS).returning(),
  };
}
