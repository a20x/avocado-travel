/**
 * Связанные выпадающие списки (замечание преподавателя по лабе 3): в каждом списке — только
 * значения, которые вместе с выбранным в остальных списках дают хотя бы одну запись.
 * Сочетания приходят из базы — например, «откуда — куда — авиакомпания» по таблице рейсов.
 * Пустое значение поля — «любое», оно ничего не ограничивает.
 */

export type Selection<K extends string = string> = Partial<Record<K, string>>;

/** Поля сочетания, по которым можно выбирать. */
type Key<T> = Extract<keyof T, string>;

/** Сочетания, совместимые с выбором во всех полях, кроме `except`. */
export function matchingCombos<T extends object>(
  combos: T[],
  selected: Selection<Key<T>>,
  except?: Key<T>,
): T[] {
  const active = (Object.entries(selected) as Array<[Key<T>, string | undefined]>).filter(
    ([field, value]) => field !== except && value,
  );
  return combos.filter((combo) => active.every(([field, value]) => combo[field] === value));
}

/** Варианты списка `field`, которые сочетаются с выбором в остальных списках. */
export function linkedOptions<T extends object, O extends { value: string }>(
  options: O[],
  combos: T[],
  selected: Selection<Key<T>>,
  field: Key<T>,
): O[] {
  const allowed = new Set(matchingCombos(combos, selected, field).map((combo) => combo[field]));
  return options.filter((option) => allowed.has(option.value as T[Key<T>]));
}
