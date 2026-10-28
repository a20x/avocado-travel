import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Xslt, XmlParser } from 'xslt-processor';
import pressFile from '../../../content/press/press-releases.json';
import { parsePressFile } from './model';
import { buildXmlTable, parsePressXml, pressToXml, xmlHref, xmlQuerySchema } from './xml';

const read = (name: string) => readFileSync(`content/press/${name}`, 'utf8');
const releases = parsePressFile(pressFile);
const xml = read('press-releases.xml');
const table = (params: Record<string, unknown>) =>
  buildXmlTable(parsePressXml(xml), xmlQuerySchema.parse(params));

/** xmllint есть на macOS и в CI (ставится в .github/workflows/ci.yml). */
function hasXmllint(): boolean {
  try {
    execFileSync('xmllint', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('пресс-релизы в XML', () => {
  it('XML-файл совпадает с JSON — после правки JSON запустите pnpm press:xml', () => {
    expect(xml).toBe(pressToXml(releases));
    expect(parsePressXml(xml)).toEqual(releases);
  });

  it('спецсимволы экранируются и читаются обратно', () => {
    const tricky = { ...releases[0]!, title: 'Тест <скобок> & «кавычек» в заголовке' };
    const [first] = parsePressXml(pressToXml([tricky, ...releases.slice(1)]));
    expect(first?.title).toBe(tricky.title);
  });

  it('XML без нужной структуры — понятная ошибка', () => {
    expect(() => parsePressXml('<other/>')).toThrow(/pressReleases/);
    expect(() => parsePressXml('<pressReleases><release id="x"/></pressReleases>')).toThrow(
      /press-releases\.xml/,
    );
  });

  it.runIf(hasXmllint())('файл проходит проверку по схеме XSD', () => {
    const output = execFileSync(
      'xmllint',
      [
        '--noout',
        '--schema',
        'content/press/press-releases.xsd',
        'content/press/press-releases.xml',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    expect(output).toBe('');
  });
});

describe('таблица вкладки «XML»', () => {
  it('по умолчанию — все записи и все семь колонок, новые сверху', () => {
    const view = table({});
    expect(view.rows).toHaveLength(18);
    expect(view.columns).toHaveLength(7);
    const dates = view.rows.map((row) => releases.find((r) => r.id === row.id)!.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('поиск — по всем полям: дата как на странице, подпись категории, «ё» как «е»', () => {
    expect(table({ q: 'СОЧИ' }).rows.length).toBeGreaterThan(0);
    expect(table({ q: '10.02.2026' }).rows.map((row) => row.id)).toEqual(['pr-001']);
    expect(table({ q: 'партнеры' }).rows.length).toBe(table({ q: 'партнёры' }).rows.length);
    expect(table({ q: 'pr-003' }).rows.map((row) => row.id)).toEqual(['pr-003']);
    expect(table({ q: 'такого-текста-нет' }).rows).toEqual([]);
  });

  it('выборка по категории и автору, неизвестный автор не применяется', () => {
    const partners = table({ category: 'partners' });
    expect(partners.rows.every((row) => row.cells.category === 'Партнёры')).toBe(true);
    expect(
      table({ author: 'Анна Белова' }).rows.every((r) => r.cells.author === 'Анна Белова'),
    ).toBe(true);
    expect(table({ author: 'Никто' }).query.author).toBeUndefined();
  });

  it('сортировка по любой колонке в обе стороны', () => {
    const titles = table({ sort: 'title', order: 'asc' }).rows.map((row) => row.cells.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'ru')));
    expect(table({ sort: 'title', order: 'desc' }).rows.map((row) => row.cells.title)).toEqual(
      [...titles].reverse(),
    );
  });

  it('видимые колонки — из адреса, мусор отбрасывается', () => {
    expect(table({ cols: ['title', 'date', 'xxx'] }).columns).toEqual(['title', 'date']);
    expect(table({ cols: 'author' }).columns).toEqual(['author']);
    expect(xmlQuerySchema.parse({ sort: 'xxx', order: 'вверх' })).toMatchObject({
      sort: 'date',
      order: 'desc',
    });
  });

  it('адрес таблицы — только параметры не по умолчанию', () => {
    const query = xmlQuerySchema.parse({});
    expect(xmlHref(query)).toBe('/xml');
    expect(xmlHref(query, { sort: 'title', order: 'asc', cols: ['title'] })).toBe(
      '/xml?sort=title&order=asc&cols=title',
    );
  });
});

describe('преобразование XSL', () => {
  const parser = new XmlParser();
  async function transform(params: Record<string, string>) {
    const xslt = new Xslt({
      parameters: Object.entries(params).map(([name, value]) => ({ name, value })),
    });
    const html = await xslt.xsltProcess(
      parser.xmlParse(xml),
      parser.xmlParse(read('press-releases.xsl')),
    );
    return { html, ids: [...html.matchAll(/class="nowrap">(pr-\d{3})/g)].map((m) => m[1]) };
  }

  it('без параметров — все записи', async () => {
    const { html, ids } = await transform({});
    expect(ids).toHaveLength(18);
    expect(html).toContain('Найдено: 18 из 18');
  });

  it('ищет, выбирает и сортирует так же, как таблица на странице', async () => {
    const xsl = await transform({ q: 'сочи', sort: 'title', order: 'ascending' });
    expect(xsl.ids).toEqual(
      table({ q: 'сочи', sort: 'title', order: 'asc' }).rows.map((r) => r.id),
    );

    const partners = await transform({ category: 'partners', order: 'descending' });
    expect(partners.ids).toEqual(table({ category: 'partners' }).rows.map((r) => r.id));
  });
});
