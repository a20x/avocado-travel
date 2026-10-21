/**
 * Какие номера страниц показать: первую, последнюю и соседние с текущей, а между ними — пропуск.
 * pageList(6, 12) → [1, 'gap', 5, 6, 7, 'gap', 12].
 */
export function pageList(page: number, totalPages: number): Array<number | 'gap'> {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: Array<number | 'gap'> = [];
  for (const p of sorted) {
    const previous = result.at(-1);
    // Пропуск ровно в одну страницу выгоднее показать номером, чем многоточием.
    if (typeof previous === 'number' && p - previous === 2) result.push(previous + 1);
    else if (typeof previous === 'number' && p - previous > 2) result.push('gap');
    result.push(p);
  }
  return result;
}
