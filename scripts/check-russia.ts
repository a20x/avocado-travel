/**
 * Проверка доступности сайта из России (L1-09): страницы открываются с узлов check-host.net,
 * которые стоят в российских сетях. Запуск: pnpm check:russia https://avocado-travel.onrender.com
 * Отчёт — таблица «страница × узел» с кодом ответа и временем. Код выхода 1, если хоть что-то не открылось.
 */

const PAGES = ['/', '/news', '/analytics', '/api/v1/airports', '/sitemap.xml', '/robots.txt'];
const CHECK_HOST = 'https://check-host.net';
const WAIT_MS = 60_000;

type NodeResult = { ok: boolean; text: string };
/** Ответ узла: [успех, время, сообщение, код, IP]; null — узел ещё проверяет. */
type RawResult = Array<[number | null, number?, string?, string?]> | null;

const json = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`check-host.net ответил ${response.status}`);
  return (await response.json()) as T;
};

async function russianNodes(): Promise<string[]> {
  const { nodes } = await json<{ nodes: Record<string, { location: string[] }> }>(
    `${CHECK_HOST}/nodes/hosts`,
  );
  return Object.keys(nodes).filter((node) => nodes[node]?.location[0] === 'ru');
}

function parse(raw: RawResult): NodeResult | null {
  const first = raw?.[0];
  if (!first || first[0] === null) return null;
  const [success, seconds = 0, message = '', code = ''] = first;
  const time = `${seconds.toFixed(2)} с`;
  return success
    ? { ok: true, text: `${code} · ${time}` }
    : { ok: false, text: message || 'ошибка' };
}

async function checkPage(url: string, nodes: string[]): Promise<Map<string, NodeResult>> {
  const query = nodes.map((node) => `&node=${node}`).join('');
  const { request_id } = await json<{ request_id: string }>(
    `${CHECK_HOST}/check-http?host=${encodeURIComponent(url)}${query}`,
  );
  const results = new Map<string, NodeResult>();
  const deadline = Date.now() + WAIT_MS;
  while (results.size < nodes.length && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    const raw = await json<Record<string, RawResult>>(`${CHECK_HOST}/check-result/${request_id}`);
    for (const node of nodes) {
      const result = parse(raw[node] ?? null);
      if (result) results.set(node, result);
    }
  }
  for (const node of nodes) {
    if (!results.has(node)) results.set(node, { ok: false, text: 'нет ответа за минуту' });
  }
  return results;
}

async function main() {
  const site = process.argv[2]?.replace(/\/+$/, '');
  if (!site || !/^https?:\/\//.test(site)) {
    throw new Error('Укажите адрес сайта: pnpm check:russia https://avocado-travel.onrender.com');
  }
  const nodes = await russianNodes();
  if (nodes.length === 0) throw new Error('У check-host.net сейчас нет узлов в России');
  console.log(`Проверка ${site} с узлов в России: ${nodes.join(', ')}\n`);

  // Страницы — параллельно: каждая проверка ждёт ответа узлов несколько секунд.
  const pages = await Promise.all(
    PAGES.map(async (path) => ({ path, results: await checkPage(site + path, nodes) })),
  );

  const rows = pages.map(({ path, results }) => ({
    страница: path,
    ...Object.fromEntries(nodes.map((node) => [node.split('.')[0], results.get(node)?.text ?? ''])),
  }));
  console.table(rows);

  const failed = pages.filter(({ results }) => [...results.values()].some((r) => !r.ok));
  if (failed.length > 0) {
    console.error(`\nНе открылись: ${failed.map(({ path }) => path).join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`\nВсе страницы открываются из России (${new Date().toISOString()})`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
