import type { SearchDocumentInput } from '@/modules/search';
import type { AirportRecord, CityRecord } from './model';

/**
 * Город для страниц сайта: запись таблицы `cities` вместе с аэропортами города
 * (docs/04-data-model.md). Названия, падежные формы и описания заводит администратор.
 */
export type City = {
  slug: string;
  name: string;
  country: string;
  timezone: string;
  airports: Array<Pick<AirportRecord, 'iata' | 'name'>>;
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

/**
 * Собирает города с их аэропортами; порядок — как у городов на входе. Город без аэропортов
 * пропускается: у него нет ни координат, ни рейсов.
 */
export function groupCities(cities: CityRecord[], airports: AirportRecord[]): City[] {
  return cities.flatMap((city) => {
    const own = airports.filter((airport) => airport.citySlug === city.slug);
    const [first] = own;
    if (!first) return [];
    return [
      {
        slug: city.slug,
        name: city.name,
        country: city.country,
        timezone: first.timezone,
        airports: own.map((airport) => ({ iata: airport.iata, name: airport.name })),
        lat: first.lat,
        lon: first.lon,
        nameFrom: city.nameFrom,
        nameTo: city.nameTo,
        description: city.description,
        image: city.image,
      },
    ];
  });
}

/** Страница города для поиска по сайту: её индексируют сид и сервис при правке города. */
export function citySearchDocument(city: City): SearchDocumentInput {
  return {
    kind: 'page',
    refId: `city:${city.slug}`,
    url: `/destinations/${city.slug}`,
    title: `${city.name} — направление`,
    body: [
      city.description,
      `${city.country}. Аэропорты: ${city.airports.map((a) => `${a.name} (${a.iata})`).join(', ')}.`,
      `Авиабилеты в ${city.nameTo} и из ${city.nameFrom}.`,
    ]
      .filter(Boolean)
      .join(' '),
    visibleFrom: null,
  };
}
