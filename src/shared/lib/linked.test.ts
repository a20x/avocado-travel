import { describe, expect, it } from 'vitest';
import { linkedOptions, matchingCombos, repairSelection } from './linked';

// Рейсы: Москва → Владивосток летают только Альтэйра и Ластавиа, Стрива — на ближних маршрутах.
const combos = [
  { from: 'moscow', to: 'vladivostok', airline: 'ALT' },
  { from: 'moscow', to: 'vladivostok', airline: 'LST' },
  { from: 'moscow', to: 'kazan', airline: 'STV' },
  { from: 'kazan', to: 'moscow', airline: 'STV' },
  { from: 'kazan', to: 'sochi', airline: 'ORN' },
];
const option = (value: string) => ({ value, label: value });
const values = (items: Array<{ value: string }>) => items.map((item) => item.value);

describe('связанные списки', () => {
  it('без выбора в списках — все значения, которые есть в сочетаниях', () => {
    const airlines = [option('ALT'), option('LST'), option('STV'), option('ORN'), option('KRR')];
    // У Кирры нет ни одного рейса — её нет и в списке.
    expect(values(linkedOptions(airlines, combos, {}, 'airline'))).toEqual([
      'ALT',
      'LST',
      'STV',
      'ORN',
    ]);
  });

  it('Москва → Владивосток: в списке авиакомпаний только те, кто туда летает', () => {
    const airlines = [option('ALT'), option('LST'), option('STV'), option('ORN')];
    expect(
      values(linkedOptions(airlines, combos, { from: 'moscow', to: 'vladivostok' }, 'airline')),
    ).toEqual(['ALT', 'LST']);
  });

  it('выбор в любом порядке: авиакомпания сужает города, свой выбор список не сужает', () => {
    const cities = [option('moscow'), option('kazan'), option('sochi'), option('vladivostok')];
    expect(values(linkedOptions(cities, combos, { airline: 'STV' }, 'to'))).toEqual([
      'moscow',
      'kazan',
    ]);
    expect(
      values(linkedOptions(cities, combos, { from: 'kazan', to: 'sochi', airline: '' }, 'to')),
    ).toEqual(['moscow', 'sochi']);
  });

  it('сочетания под выбор — для подсказки о датах', () => {
    expect(matchingCombos(combos, { from: 'kazan' })).toHaveLength(2);
    expect(matchingCombos(combos, { from: 'kazan', airline: 'ORN' })).toEqual([
      { from: 'kazan', to: 'sochi', airline: 'ORN' },
    ]);
    expect(matchingCombos(combos, { from: 'moscow', airline: 'ORN' })).toEqual([]);
  });
});

describe('выбор без записей исправляется', () => {
  const order = ['from', 'to', 'airline'] as Array<'from' | 'to' | 'airline'>;

  it('рабочий выбор не меняется', () => {
    const selected = { from: 'moscow', to: 'vladivostok', airline: 'ALT' };
    expect(repairSelection(combos, selected, order)).toEqual({
      selection: selected,
      dropped: false,
    });
  });

  it('Москва и Орнавиа не сочетаются — остаётся первое по порядку условие', () => {
    expect(repairSelection(combos, { from: 'moscow', airline: 'ORN' }, order)).toEqual({
      selection: { from: 'moscow' },
      dropped: true,
    });
  });

  it('значения, которого нет совсем, не остаётся, остальные условия работают', () => {
    expect(repairSelection(combos, { from: 'nowhere', airline: 'STV' }, order)).toEqual({
      selection: { airline: 'STV' },
      dropped: true,
    });
  });

  it('пустой выбор остаётся пустым', () => {
    expect(repairSelection(combos, {}, order)).toEqual({ selection: {}, dropped: false });
  });
});
