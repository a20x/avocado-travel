/**
 * Возврат на страницу, откуда пришли: формы и списки админки получают её адрес параметром `back`
 * и возвращаются туда со стрелки и после сохранения. Адрес приходит из запроса, поэтому
 * принимаются только свои страницы: чужой адрес не станет переадресацией на другой сайт.
 */
const RETURN_PATHS = ['/database', '/admin', '/admin/flights', '/admin/cities', '/admin/airlines'];
const NOTICES = ['saved', 'created', 'deleted'];
const LOCAL = 'http://local';
/** С запасом на цепочку «вкладка БД → список → форма», где адрес вложен в адрес. */
const MAX_LENGTH = 500;

/** Разрешённый адрес возврата без прошлых уведомлений или undefined. */
export function returnPath(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.length > MAX_LENGTH) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(value, LOCAL);
  } catch {
    return undefined;
  }
  // `//site.ru` и `/\site.ru` браузер понял бы как другой сайт — у них другой хост.
  if (url.origin !== LOCAL || !RETURN_PATHS.includes(url.pathname)) return undefined;
  for (const notice of NOTICES) url.searchParams.delete(notice);
  return `${url.pathname}${url.search}`;
}

/** Адрес с параметрами: к уже имеющимся добавляются новые. */
export function withParams(path: string, params: Record<string, string | number>): string {
  const url = new URL(path, LOCAL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return `${url.pathname}${url.search}`;
}

/** Страница, которая знает, куда вернуться; без адреса возврата — обычная. */
export function withBack(path: string, back: string | undefined): string {
  return back ? withParams(path, { back }) : path;
}
