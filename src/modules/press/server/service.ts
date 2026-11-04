import 'server-only';
// Данные лабы 2 лежат вне src (docs/03-architecture.md): JSON попадает в сборку сервера
// и проверяется Zod-схемой при первом обращении.
import pressFile from '../../../../content/press/press-releases.json';
import pressSchema from '../../../../content/press/press-releases.schema.json';
import { syncPageDocuments } from '@/modules/search/server';
import {
  PRESS_REF_PREFIX,
  parsePressFile,
  pressSearchDocuments,
  type PressRelease,
} from '../model';

let releases: PressRelease[] | undefined;

/** Пресс-релизы из файла, проверенные схемой; файл разбирается один раз на запуск сервера. */
export function loadPressReleases(): PressRelease[] {
  releases ??= parsePressFile(pressFile);
  return releases;
}

/**
 * Пресс-релизы — в поиск по сайту. Вызывается при запуске сервера на хостинге
 * (src/instrumentation.ts), как страницы «Пассажирам»: сид на боевой базе запускать нельзя,
 * а адреса релизов переехали со страницы «Пресс-центр» на вкладку «XML». Раздел `press`
 * заменяется целиком — старая запись «Пресс-центр» удаляется, остальное не трогается.
 */
export function indexPressReleases(): Promise<void> {
  return syncPageDocuments(PRESS_REF_PREFIX, pressSearchDocuments(loadPressReleases()));
}

/** Исходные данные и схема — тот же набор в JSON, ссылками в «Исходных файлах» вкладки «XML» (L2-06). */
export function getPressSources(): { data: unknown; schema: unknown } {
  loadPressReleases(); // отдаём только проверенный файл
  return { data: pressFile, schema: pressSchema };
}
