import { describe, expect, it } from 'vitest';
import { HIGHLIGHT, describeQuery, parseQuery, splitHighlights, toWebSearch } from './model';

describe('разбор поискового запроса', () => {
  it('слова через пробел и «И» — все сразу', () => {
    const parsed = parseQuery('Багаж и Калининград');
    expect(parsed).toEqual([{ include: ['багаж', 'калининград'], exclude: [] }]);
    expect(toWebSearch(parsed)).toBe('багаж калининград');
  });

  it('«ИЛИ» делит запрос на группы, «НЕ» и минус — исключают слово', () => {
    const parsed = parseQuery('море НЕ Сочи ИЛИ горы -зима');
    expect(parsed).toEqual([
      { include: ['море'], exclude: ['сочи'] },
      { include: ['горы'], exclude: ['зима'] },
    ]);
    expect(toWebSearch(parsed)).toBe('море -сочи or горы -зима');
    expect(describeQuery(parsed)).toBe('«море», без «сочи» ИЛИ «горы», без «зима»');
  });

  it('операторы понимаются и по-английски', () => {
    expect(toWebSearch(parseQuery('baggage AND kazan OR ufa NOT sochi'))).toBe(
      'baggage kazan or ufa -sochi',
    );
  });

  it('фраза в кавычках ищется целиком', () => {
    expect(toWebSearch(parseQuery('"выбор мест" ИЛИ багаж'))).toBe('"выбор мест" or багаж');
  });

  it('«ё» равна «е», служебные символы и кавычки внутри слов отбрасываются', () => {
    expect(toWebSearch(parseQuery('Ёлка <script> (Пулково)'))).toBe('елка script пулково');
    expect(toWebSearch(parseQuery('санкт-петербург'))).toBe('санкт-петербург');
  });

  it('группа без искомых слов отбрасывается, пустой запрос — пустой', () => {
    expect(parseQuery('НЕ сочи')).toEqual([]);
    expect(parseQuery('ИЛИ И НЕ')).toEqual([]);
    expect(parseQuery('   ')).toEqual([]);
    expect(toWebSearch(parseQuery('НЕ сочи ИЛИ казань'))).toBe('казань');
  });
});

describe('подсветка найденного', () => {
  it('куски с отметками и без', () => {
    const text = `Рейсы в ${HIGHLIGHT.start}Калининград${HIGHLIGHT.stop} каждый день`;
    expect(splitHighlights(text)).toEqual([
      { text: 'Рейсы в ', mark: false },
      { text: 'Калининград', mark: true },
      { text: ' каждый день', mark: false },
    ]);
    expect(splitHighlights('без отметок')).toEqual([{ text: 'без отметок', mark: false }]);
  });
});
