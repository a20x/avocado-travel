import 'server-only';
import { nearestDates } from '@/shared/lib/available-days';
import { addDays, zonedTimeToUtc } from '@/shared/lib/time';
import {
  FLIGHTS_PAGE_SIZE,
  dbQuerySchema,
  fillScores,
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
  result: DbResult;
  /** Текст выполненных запросов — для блока «SQL этого запроса». */
  sql: SqlText[];
};

/**
 * Запрос вкладки «БД» по параметрам адреса (лаба 3): форма → проверка Zod → запрос к базе.
 * Ничего не меняет — только чтение.
 */
export async function runDatabaseQuery(params: Record<string, unknown>): Promise<DatabasePage> {
  const query = dbQuerySchema.parse(params);
  const range = rangeOf(query);

  switch (query.report) {
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

/** Паспорт базы (раздел «О базе данных»). */
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
