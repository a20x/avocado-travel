import 'server-only';
import { getPressSources } from './service';

/** JSON с отступами — чтобы файл было удобно читать прямо в браузере. */
function prettyJson(value: unknown): Response {
  return new Response(`${JSON.stringify(value, null, 2)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Обработчик `src/app/press/press-releases.json`: пресс-релизы в JSON — второй формат вкладки «XML». */
export function handlePressData(): Response {
  return prettyJson(getPressSources().data);
}

/** Обработчик `src/app/press/press-releases.schema.json`: JSON Schema этих данных. */
export function handlePressSchema(): Response {
  return prettyJson(getPressSources().schema);
}
