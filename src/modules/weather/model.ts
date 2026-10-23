import { z } from 'zod';

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

/** Город для прогноза. */
export type WeatherPlace = { slug: string; name: string; lat: number; lon: number };

export type DayForecast = { date: string; code: number; max: number; min: number };

export type CityWeather = {
  slug: string;
  name: string;
  temperature: number;
  code: number;
  /** Ветер, м/с. */
  wind: number;
  /** Сегодня и следующие дни. */
  days: DayForecast[];
};

export const FORECAST_DAYS = 3;

/** Коды погоды WMO, которые отдаёт Open-Meteo: описание и значок. */
const CODES: Array<[number[], string, WeatherKind]> = [
  [[0], 'Ясно', 'clear'],
  [[1], 'Преимущественно ясно', 'partly'],
  [[2], 'Переменная облачность', 'partly'],
  [[3], 'Пасмурно', 'cloudy'],
  [[45, 48], 'Туман', 'fog'],
  [[51, 53, 55, 56, 57], 'Морось', 'rain'],
  [[61, 63, 65, 66, 67], 'Дождь', 'rain'],
  [[80, 81, 82], 'Ливень', 'rain'],
  [[71, 73, 75, 77, 85, 86], 'Снег', 'snow'],
  [[95, 96, 99], 'Гроза', 'storm'],
];

export function describeWeather(code: number): { label: string; kind: WeatherKind } {
  const found = CODES.find(([codes]) => codes.includes(code));
  return found ? { label: found[1], kind: found[2] } : { label: 'Облачно', kind: 'cloudy' };
}

/** «+12°», «−3°» (настоящий минус, а не дефис), «0°». */
export function formatTemperature(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}°`;
  if (rounded < 0) return `−${Math.abs(rounded)}°`;
  return '0°';
}

/** Один запрос на все города: Open-Meteo принимает координаты через запятую. */
export function forecastUrl(places: WeatherPlace[]): string {
  const params = new URLSearchParams({
    latitude: places.map((p) => p.lat.toFixed(4)).join(','),
    longitude: places.map((p) => p.lon.toFixed(4)).join(','),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    wind_speed_unit: 'ms',
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

const forecastSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    weather_code: z.number().int(),
    wind_speed_10m: z.number(),
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number().int()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
  }),
});

/**
 * Ответ Open-Meteo → погода по городам в том же порядке. На один город сервис отвечает
 * объектом, на несколько — массивом. null — ответ не такой, как ожидали.
 */
export function parseForecast(json: unknown, places: WeatherPlace[]): CityWeather[] | null {
  const list = z.array(forecastSchema).safeParse(Array.isArray(json) ? json : [json]);
  if (!list.success || list.data.length !== places.length) return null;

  return list.data.map((forecast, i) => {
    const place = places[i] as WeatherPlace;
    const { daily } = forecast;
    return {
      slug: place.slug,
      name: place.name,
      temperature: forecast.current.temperature_2m,
      code: forecast.current.weather_code,
      wind: forecast.current.wind_speed_10m,
      days: daily.time.map((date, day) => ({
        date,
        code: daily.weather_code[day] ?? 3,
        max: daily.temperature_2m_max[day] ?? 0,
        min: daily.temperature_2m_min[day] ?? 0,
      })),
    };
  });
}
