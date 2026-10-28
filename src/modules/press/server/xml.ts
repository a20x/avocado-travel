import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Xslt, XmlParser } from 'xslt-processor';
import { buildXmlTable, parsePressXml, xmlQuerySchema, type XmlTableView } from '../xml';

/**
 * Файлы лабы 2 в XML (ADR-0010): данные, схема и преобразование лежат рядом с JSON
 * в content/press. В сборку Docker они попадают через outputFileTracingIncludes (next.config.ts).
 */
const FILES = {
  xml: 'press-releases.xml',
  xsd: 'press-releases.xsd',
  xsl: 'press-releases.xsl',
} as const;
type PressXmlFile = keyof typeof FILES;

const cache = new Map<PressXmlFile, Promise<string>>();

/** Текст файла; читается один раз на запуск сервера — файлы меняются только с новой версией. */
function readPressFile(file: PressXmlFile): Promise<string> {
  let text = cache.get(file);
  if (!text) {
    text = readFile(path.join(process.cwd(), 'content/press', FILES[file]), 'utf8');
    cache.set(file, text);
  }
  return text;
}

/** Таблица вкладки «XML»: данные — из XML-файла, проверенные той же схемой, что и JSON. */
export async function getXmlTable(params: Record<string, unknown>): Promise<XmlTableView> {
  const releases = parsePressXml(await readPressFile('xml'));
  return buildXmlTable(releases, xmlQuerySchema.parse(params));
}

const CONTENT_TYPES: Record<PressXmlFile, string> = {
  // text/xml и text/xsl: с такими типами браузер сам применит XSL к XML при открытии файла.
  xml: 'text/xml; charset=utf-8',
  xsd: 'text/xml; charset=utf-8',
  xsl: 'text/xsl; charset=utf-8',
};

/** Обработчики `src/app/xml/press-releases.*`: исходные файлы как есть. */
export async function handlePressXmlFile(file: PressXmlFile): Promise<Response> {
  return new Response(await readPressFile(file), {
    headers: { 'Content-Type': CONTENT_TYPES[file] },
  });
}

/**
 * Обработчик `/xml/transform`: XSL-преобразование на сервере с параметрами из адреса —
 * поиск, выборка и сортировка делает сам XSL. Значения проходят ту же проверку, что
 * у таблицы, и передаются в XSL параметрами, а не вставляются в текст преобразования.
 */
export async function handlePressTransform(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const query = xmlQuerySchema.parse({
    ...params,
    // У XSL порядок называется как в xsl:sort: ascending / descending.
    order:
      params.order === 'ascending' ? 'asc' : params.order === 'descending' ? 'desc' : params.order,
  });

  const parser = new XmlParser();
  const xslt = new Xslt({
    parameters: [
      { name: 'q', value: query.q },
      { name: 'category', value: query.category ?? '' },
      { name: 'author', value: query.author ?? '' },
      // Колонки «Кратко» и «Текст» XSL не сортирует: длинный текст — не ключ сортировки.
      {
        name: 'sort',
        value: query.sort === 'summary' || query.sort === 'body' ? 'date' : query.sort,
      },
      { name: 'order', value: query.order === 'asc' ? 'ascending' : 'descending' },
    ],
  });
  const html = await xslt.xsltProcess(
    parser.xmlParse(await readPressFile('xml')),
    parser.xmlParse(await readPressFile('xsl')),
  );
  return new Response(`<!DOCTYPE html>\n${html}`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
