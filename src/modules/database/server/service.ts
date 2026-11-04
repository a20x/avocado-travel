import 'server-only';
import { nearestDates } from '@/shared/lib/available-days';
import { addDays, dateInZone, zonedTimeToUtc } from '@/shared/lib/time';
import {
  FLIGHTS_PAGE_SIZE,
  dbQuerySchema,
  fillScores,
  pickAirline,
  type DbPassport,
  type DbQuery,
  type DbResult,
  type FlightCombo,
  type SqlText,
} from '../model';
import * as repository from './repository';

const ZONE = 'Europe/Moscow';

/** Даты формы (по Москве, включительно) → период в UTC; пустая дата не ограничивает. */
function rangeOf(query: DbQuery): repository.Range {
  return {
    start: query.dateFrom ? zonedTimeToUtc(query.dateFrom, '00:00', ZONE) : undefined,
    end: query.dateTo ? zonedTimeToUtc(addDays(query.dateTo, 1), '00:00', ZONE) : undefined,
  };
}

export type DatabasePage = {
  query: DbQuery;
  /** Нет у разделов без запроса — «Ввод» и «Сведения о БД». */
  result: DbResult | null;
  /** Текст выполненных запросов — для блока «SQL этого запроса». */
  sql: SqlText[];
};

/**
 * Запрос вкладки «БД» по параметрам адреса (лаба 3): форма → проверка Zod → запрос к базе.
 * Ничего не меняет — только чтение.
 */
export async function runDatabaseQuery(
  params: Record<string, unknown>,
  now: Date = new Date(),
): Promise<DatabasePage> {
  const parsed = dbQuerySchema.parse(params);
  const range = rangeOf(parsed);
  let query = parsed;

  switch (query.report) {
    case 'input':
    case 'about':
      return { query, result: null, sql: [] };
    case 'airline': {
      // Рейсы с начала сегодняшнего дня по Москве: в списке только авиакомпании, у которых
      // они есть, поэтому результат не бывает пустым.
      const since = zonedTimeToUtc(dateInZone(now, ZONE), '00:00', ZONE);
      const list = await repository.listFlightAirlines(since);
      const { options, selected } = pickAirline(list.rows, query.airline);
      query = { ...query, airline: selected };
      const page = query.page;
      const found = selected
        ? await repository.searchFlights(
            { airline: selected, range: { start: since } },
            'departure',
            { limit: FLIGHTS_PAGE_SIZE, offset: (page - 1) * FLIGHTS_PAGE_SIZE },
          )
        : { rows: [], total: 0, sql: [] };
      return {
        query,
        result: {
          report: 'airline',
          airlines: options,
          airline: selected,
          rows: found.rows,
          total: found.total,
          page,
          totalPages: Math.max(1, Math.ceil(found.total / FLIGHTS_PAGE_SIZE)),
        },
        sql: [list.sql, ...found.sql],
      };
    }
    case 'flights': {
      const page = query.page;
      const filter = { from: query.from, to: query.to, airline: query.airline };
      const found = await repository.searchFlights({ ...filter, range }, query.sort, {
        limit: FLIGHTS_PAGE_SIZE,
        offset: (page - 1) * FLIGHTS_PAGE_SIZE,
      });
      // Пусто из-за дат — подсказываем ближайшие дни, когда по тем же условиям есть рейсы.
      const start = query.dateFrom ?? query.dateTo;
      const end = query.dateTo ?? query.dateFrom;
      const days =
        found.total === 0 && start && end
          ? await repository.findFlightDays(filter, {
              before: range.start ?? range.end,
              after: range.end ?? range.start,
            })
          : [];
      return {
        query,
        result: {
          report: 'flights',
          rows: found.rows,
          total: found.total,
          page,
          totalPages: Math.max(1, Math.ceil(found.total / FLIGHTS_PAGE_SIZE)),
          nearestDates: start && end ? nearestDates(days, start, end) : [],
        },
        sql: found.sql,
      };
    }
    case 'routes': {
      const found = await repository.findRoutes({ airline: query.airline, to: query.to });
      return { query, result: { report: 'routes', rows: found.rows }, sql: [found.sql] };
    }
    case 'airlines': {
      const found = await repository.summarizeAirlines(range);
      return { query, result: { report: 'airlines', rows: found.rows }, sql: [found.sql] };
    }
    case 'months': {
      const found = await repository.summarizeMonths(range, query.airline);
      return { query, result: { report: 'months', rows: found.rows }, sql: [found.sql] };
    }
    case 'ratings': {
      const found = await repository.summarizeRatings();
      return {
        query,
        result: { report: 'ratings', rows: fillScores(found.rows), summary: found.summary },
        sql: found.sql,
      };
    }
  }
}

/** Паспорт базы (раздел «Сведения о БД»). */
export function getPassport(): Promise<DbPassport> {
  return repository.readPassport();
}

/**
 * Сочетания «откуда — куда — авиакомпания», для которых есть рейсы, с их датами: из них строятся
 * связанные списки первого и второго запросов (замечание преподавателя по лабе 3).
 */
export function getFlightCombos(): Promise<FlightCombo[]> {
  return repository.listFlightCombos();
}
