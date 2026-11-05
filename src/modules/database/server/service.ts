import 'server-only';
import { nearestDates } from '@/shared/lib/available-days';
import { repairSelection } from '@/shared/lib/linked';
import { addDays, dateInZone, zonedTimeToUtc } from '@/shared/lib/time';
import {
  DIRECTORY_REPORTS,
  FLIGHTS_PAGE_SIZE,
  dbQuerySchema,
  clampToSales,
  directoryChoices,
  fillScores,
  pickAirline,
  salesPeriod,
  type DbPassport,
  type DbQuery,
  type DbResult,
  type DirectoryField,
  type FlightCombo,
  type SalesSpan,
  type SqlText,
} from '../model';
import * as repository from './repository';

const ZONE = 'Europe/Moscow';

/** По русскому алфавиту: порядок строк в PostgreSQL зависит от настроек сервера. */
const sortByLabel = <T>(rows: T[], label: (row: T) => string) =>
  rows.sort((a, b) => label(a).localeCompare(label(b), 'ru'));

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
  /** Периоды продаж авиакомпаний — границы календаря в сводках продаж (только у них). */
  salesSpans?: SalesSpan[];
  /** Сочетания для связанных списков поиска рейсов и «Авиакомпании и направления». */
  combos?: FlightCombo[];
  /** Выбрали сочетание без записей — часть условий снята, чтобы результат был. */
  dropped?: boolean;
};

/** Запрос с исправленным выбором: снятые значения становятся пустыми. */
function withSelection<F extends 'from' | 'to' | 'airline' | DirectoryField>(
  query: DbQuery,
  fields: readonly F[],
  selection: Partial<Record<F, string>>,
): DbQuery {
  const next: DbQuery = { ...query };
  for (const field of fields) next[field as keyof Pick<DbQuery, F>] = selection[field];
  return next;
}

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
      const combos = await repository.listFlightCombos();
      const fields = ['from', 'to', 'airline'] as const;
      const { selection, dropped } = repairSelection(
        combos,
        { from: query.from, to: query.to, airline: query.airline },
        [...fields],
      );
      query = withSelection(query, fields, selection);
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
        combos,
        dropped,
      };
    }
    case 'routes': {
      const combos = await repository.listFlightCombos();
      const fields = ['airline', 'to'] as const;
      const { selection, dropped } = repairSelection(
        combos,
        { airline: query.airline, to: query.to },
        [...fields],
      );
      query = withSelection(query, fields, selection);
      const found = await repository.findRoutes(selection);
      return {
        query,
        result: { report: 'routes', rows: found.rows },
        sql: [found.sql],
        combos,
        dropped,
      };
    }
    case 'countryCity':
    case 'partZone': {
      const report = query.report;
      const { fields } = DIRECTORY_REPORTS[report];
      const list = await repository.listDirectoryCities();
      const names = Object.fromEntries(list.rows.map((row) => [row.city, row.name]));
      const choices = directoryChoices(list.rows, fields, names);
      const { selection, dropped } = repairSelection(
        choices.combos,
        Object.fromEntries(fields.map((field) => [field, query[field]])),
        [...fields],
      );
      query = withSelection(query, fields, selection);
      const found = await repository.findDirectoryCities(selection);
      return {
        query,
        result: { report, rows: sortByLabel(found.rows, (row) => row.city), choices },
        sql: [list.sql, found.sql],
        dropped,
      };
    }
    case 'countryAirline':
    case 'typeAirline': {
      const report = query.report;
      const { fields } = DIRECTORY_REPORTS[report];
      const list = await repository.listDirectoryAirlines();
      const names = Object.fromEntries(list.rows.map((row) => [row.airline, row.name]));
      const choices = directoryChoices(list.rows, fields, names);
      const { selection, dropped } = repairSelection(
        choices.combos,
        Object.fromEntries(fields.map((field) => [field, query[field]])),
        [...fields],
      );
      query = withSelection(query, fields, selection);
      const found = await repository.findDirectoryAirlines(selection);
      return {
        query,
        result: { report, rows: sortByLabel(found.rows, (row) => row.airline), choices },
        sql: [list.sql, found.sql],
        dropped,
      };
    }
    case 'schedule': {
      const found = await repository.summarizeSchedule(now);
      return { query, result: { report: 'schedule', rows: found.rows }, sql: [found.sql] };
    }
    case 'airlines':
    case 'months': {
      // Даты — в периоде продаж (у «Динамики» по выбранной авиакомпании): вне его пусто.
      const salesSpans = await repository.listSalesSpans();
      const airline = query.report === 'months' ? query.airline : undefined;
      const period = salesPeriod(salesSpans, airline);
      query = clampToSales(query, period);
      const clamped = rangeOf(query);
      if (query.report === 'airlines') {
        const found = await repository.summarizeAirlines(clamped);
        return {
          query,
          result: { report: 'airlines', rows: found.rows, period },
          sql: [found.sql],
          salesSpans,
        };
      }
      const found = await repository.summarizeMonths(clamped, airline);
      return {
        query,
        result: { report: 'months', rows: found.rows, period },
        sql: [found.sql],
        salesSpans,
      };
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
