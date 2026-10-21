import { buildCabin, type CabinClass, type CabinRow } from '@/modules/catalog-data';
import { EXTRA_LEGROOM_PRICE } from './seat-selection';

/** Кресло на схеме: номер, занято ли и сколько стоит. */
export type SeatInfo = { id: string; taken: boolean; price: number };

export type SeatMapRow = Omit<CabinRow, 'groups'> & { groups: SeatInfo[][] };

type Layout = Parameters<typeof buildCabin>[0];

/**
 * Схема салона рейса: ряды из модели самолёта, цена каждого кресла и занятость.
 * Цена — базовая цена класса, в рядах с местом для ног эконома — плюс доплата.
 */
export function buildSeatMap(
  layout: Layout,
  prices: Record<CabinClass, number>,
  taken: ReadonlySet<string>,
): SeatMapRow[] {
  return buildCabin(layout).map(({ groups, ...row }) => {
    const price = prices[row.cabinClass] + (row.extraLegroom ? EXTRA_LEGROOM_PRICE : 0);
    return {
      ...row,
      groups: groups.map((group) =>
        group.map((letter) => {
          const id = `${row.number}${letter}`;
          return { id, taken: taken.has(id), price };
        }),
      ),
    };
  });
}
