import { describe, expect, it } from 'vitest';
import { pageList } from './pagination';

describe('номера страниц', () => {
  it('мало страниц — все подряд', () => {
    expect(pageList(1, 1)).toEqual([1]);
    expect(pageList(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('много страниц — края, соседи текущей и пропуски', () => {
    expect(pageList(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12]);
    expect(pageList(1, 12)).toEqual([1, 2, 'gap', 12]);
    expect(pageList(12, 12)).toEqual([1, 'gap', 11, 12]);
  });

  it('пропуск в одну страницу показывает её номер', () => {
    expect(pageList(4, 12)).toEqual([1, 2, 3, 4, 5, 'gap', 12]);
  });
});
