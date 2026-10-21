import type { AircraftModel } from './model';

export type CabinClass = 'business' | 'economy';

export type CabinRow = {
  number: number;
  cabinClass: CabinClass;
  /** Группы кресел между проходами: `ABC-DEF` → [['A','B','C'], ['D','E','F']]. */
  groups: string[][];
  /** Ряд с увеличенным расстоянием для ног: первый ряд эконома и ряд у аварийного выхода. */
  extraLegroom: boolean;
};

type CabinLayout = Pick<
  AircraftModel,
  'businessRows' | 'businessLayout' | 'economyRows' | 'economyLayout'
>;

// Буквы кресел в авиации: от A до K без I — её легко спутать с цифрой 1.
const SEAT_LETTER = /^[A-HJK]$/;

/**
 * Разбирает схему ряда: `AC-DF`, `ABC-DEF`, `ABC-DEFG-HJK`. Дефис — проход.
 * Бросает исключение на неверной схеме: это ошибка в данных, а не ожидаемая ситуация.
 */
export function parseLayout(layout: string): string[][] {
  const groups = layout.split('-').map((group) => group.split(''));
  const letters = groups.flat();

  if (groups.some((group) => group.length === 0) || letters.length === 0) {
    throw new Error(`Пустая группа кресел в схеме «${layout}»`);
  }
  if (!letters.every((letter) => SEAT_LETTER.test(letter))) {
    throw new Error(`Недопустимая буква кресла в схеме «${layout}»`);
  }
  if (new Set(letters).size !== letters.length) {
    throw new Error(`Буква кресла повторяется в схеме «${layout}»`);
  }
  return groups;
}

/** Все ряды салона по порядку: сначала бизнес, затем эконом. Нумерация рядов сквозная с 1. */
export function buildCabin(model: CabinLayout): CabinRow[] {
  const business = parseLayout(model.businessLayout);
  const economy = parseLayout(model.economyLayout);
  const rows: CabinRow[] = [];

  // Аварийный выход — посередине эконома: перед ним ряд стоит свободнее.
  const exitRow = Math.floor(model.economyRows / 2) + 1;

  for (let i = 1; i <= model.businessRows; i++) {
    rows.push({ number: i, cabinClass: 'business', groups: business, extraLegroom: false });
  }
  for (let i = 1; i <= model.economyRows; i++) {
    rows.push({
      number: model.businessRows + i,
      cabinClass: 'economy',
      groups: economy,
      extraLegroom: i === 1 || i === exitRow,
    });
  }
  return rows;
}

/** Номера всех кресел: `1A`, `1C`, … */
export function listSeats(model: CabinLayout): string[] {
  return buildCabin(model).flatMap((row) =>
    row.groups.flat().map((letter) => `${row.number}${letter}`),
  );
}

/** Вместимость самолёта по классам. */
export function seatCapacity(model: CabinLayout): Record<CabinClass, number> {
  const perRow = (layout: string) => parseLayout(layout).flat().length;
  return {
    business: model.businessRows * perRow(model.businessLayout),
    economy: model.economyRows * perRow(model.economyLayout),
  };
}

/** Класс кресла по его номеру или null, если такого кресла в самолёте нет. */
export function seatClass(model: CabinLayout, seat: string): CabinClass | null {
  const match = /^(\d+)([A-Z])$/.exec(seat);
  if (!match) return null;
  const row = buildCabin(model)[Number(match[1]) - 1];
  if (!row || !row.groups.flat().includes(match[2] ?? '')) return null;
  return row.cabinClass;
}
