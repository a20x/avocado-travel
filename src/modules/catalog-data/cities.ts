import type { Airport } from './model';

/**
 * Города — не отдельная таблица: город собирается из аэропортов с одинаковым `citySlug`.
 * Описания и падежные формы названий — редакционный текст, он меняется вместе с кодом,
 * поэтому хранится здесь, а не в базе (docs/04-data-model.md).
 */

export type City = {
  slug: string;
  name: string;
  country: string;
  timezone: string;
  airports: Array<Pick<Airport, 'iata' | 'name'>>;
  /** Координаты первого аэропорта города — для погоды и карты. */
  lat: number;
  lon: number;
  /** Название после «из»: «из Москвы». */
  nameFrom: string;
  /** Название после «в»: «в Москву». */
  nameTo: string;
  description: string;
  /** Иллюстрация из public/images/destinations. */
  image: string;
};

// prettier-ignore
const DESCRIPTIONS: Record<string, string> = {
  moscow: 'Столица и главный узел нашей сети: отсюда есть прямые рейсы во все города. Три аэропорта — Шереметьево, Внуково и Домодедово, поэтому при покупке билета стоит смотреть, из какого именно вылетает рейс.',
  'saint-petersburg': 'Город белых ночей, разводных мостов и Эрмитажа. Пулково — второй по числу рейсов аэропорт сети: прямые перелёты в крупные города России и за рубеж.',
  kaliningrad: 'Самый западный регион страны: Балтийское море, Куршская коса и янтарь. Из-за расположения добраться сюда проще всего самолётом.',
  sochi: 'Курорт на два сезона: летом — море, зимой — горнолыжная Красная Поляна. Рейсы в Сочи есть почти из всех городов сети.',
  kazan: 'Столица Татарстана, где рядом стоят мечеть Кул-Шариф и Благовещенский собор. Удобна для поездки на выходные: из Москвы лететь меньше двух часов.',
  vladivostok: 'Город на берегу Тихого океана в конце Транссиба. Самый дальний город сети внутри страны — девять часов полёта из Москвы.',
  yekaterinburg: 'Столица Урала на границе Европы и Азии. Деловой город с конструктивистской архитектурой и прямыми рейсами в Сочи и Дубай.',
  novosibirsk: 'Крупнейший город Сибири и пересадочный узел на востоке сети. Отсюда летают в Пекин, Ташкент и соседние сибирские города.',
  samara: 'Волжский город с самой длинной в стране набережной. Рейсы в Москву каждый день и в Сочи несколько раз в неделю.',
  ufa: 'Столица Башкортостана на высоком берегу реки Белой. Рядом — Уральские горы и десятки озёр.',
  krasnoyarsk: 'Город на Енисее рядом с заповедником «Столбы». Прямые рейсы в Москву, Новосибирск и Иркутск.',
  irkutsk: 'Ворота к Байкалу: до озера около часа на машине. Связан рейсами с Москвой, Красноярском и Владивостоком.',
  'mineralnye-vody': 'Воздушные ворота Кавказских Минеральных Вод — Пятигорска, Кисловодска и Ессентуков. Сюда едут на лечение и в горы.',
  istanbul: 'Город на двух континентах по берегам Босфора. Летаем из Москвы, Санкт-Петербурга и Казани.',
  dubai: 'Небоскрёбы, пустыня и тёплое море круглый год. Самый популярный зарубежный курорт в нашей сети.',
  yerevan: 'Один из древнейших городов мира с видом на Арарат. Перелёт из Москвы — около трёх часов.',
  tashkent: 'Столица Узбекистана: восточные базары, голубые купола и плов. Отсюда удобно ехать в Самарканд и Бухару.',
  beijing: 'Столица Китая: Запретный город, храм Неба и Великая стена в часе езды. Летаем из Москвы и Новосибирска.',
};

/** Формы названий для поиска-фразы: «Я лечу из Москвы в Казань». */
// prettier-ignore
const FORMS: Record<string, { from: string; to: string }> = {
  moscow: { from: 'Москвы', to: 'Москву' },
  'saint-petersburg': { from: 'Санкт-Петербурга', to: 'Санкт-Петербург' },
  kaliningrad: { from: 'Калининграда', to: 'Калининград' },
  sochi: { from: 'Сочи', to: 'Сочи' },
  kazan: { from: 'Казани', to: 'Казань' },
  vladivostok: { from: 'Владивостока', to: 'Владивосток' },
  yekaterinburg: { from: 'Екатеринбурга', to: 'Екатеринбург' },
  novosibirsk: { from: 'Новосибирска', to: 'Новосибирск' },
  samara: { from: 'Самары', to: 'Самару' },
  ufa: { from: 'Уфы', to: 'Уфу' },
  krasnoyarsk: { from: 'Красноярска', to: 'Красноярск' },
  irkutsk: { from: 'Иркутска', to: 'Иркутск' },
  'mineralnye-vody': { from: 'Минеральных Вод', to: 'Минеральные Воды' },
  istanbul: { from: 'Стамбула', to: 'Стамбул' },
  dubai: { from: 'Дубая', to: 'Дубай' },
  yerevan: { from: 'Еревана', to: 'Ереван' },
  tashkent: { from: 'Ташкента', to: 'Ташкент' },
  beijing: { from: 'Пекина', to: 'Пекин' },
};

const DEFAULT_IMAGE = '/images/destinations/default.svg';

/** Собирает города из аэропортов; порядок городов — как у первых аэропортов в списке. */
export function groupCities(airports: Airport[]): City[] {
  const cities = new Map<string, City>();
  for (const airport of airports) {
    const city = cities.get(airport.citySlug);
    if (city) {
      city.airports.push({ iata: airport.iata, name: airport.name });
      continue;
    }
    const description = DESCRIPTIONS[airport.citySlug];
    cities.set(airport.citySlug, {
      slug: airport.citySlug,
      name: airport.city,
      country: airport.country,
      timezone: airport.timezone,
      airports: [{ iata: airport.iata, name: airport.name }],
      lat: airport.lat,
      lon: airport.lon,
      // Для города без записанных форм лучше несклоняемое название, чем ошибка.
      nameFrom: FORMS[airport.citySlug]?.from ?? airport.city,
      nameTo: FORMS[airport.citySlug]?.to ?? airport.city,
      description: description ?? '',
      // Иллюстрации нарисованы для городов с описанием, для остальных — общая картинка.
      image: description ? `/images/destinations/${airport.citySlug}.svg` : DEFAULT_IMAGE,
    });
  }
  return [...cities.values()];
}
