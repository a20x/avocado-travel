import 'server-only';
// Данные лабы 2 лежат вне src (docs/03-architecture.md): JSON попадает в сборку сервера
// и проверяется Zod-схемой при первом обращении.
import pressFile from '../../../../content/press/press-releases.json';
import pressSchema from '../../../../content/press/press-releases.schema.json';
import {
  buildPressView,
  parsePressFile,
  pressQuerySchema,
  type PressRelease,
  type PressView,
} from '../model';

let releases: PressRelease[] | undefined;

/** Пресс-релизы из файла, проверенные схемой; файл разбирается один раз на запуск сервера. */
export function loadPressReleases(): PressRelease[] {
  releases ??= parsePressFile(pressFile);
  return releases;
}

/** Страница пресс-центра: параметры адреса → выборка, сортировка и модель отображения. */
export function getPressView(params: Record<string, unknown>): PressView {
  return buildPressView(loadPressReleases(), pressQuerySchema.parse(params));
}

/** Исходные данные и схема — для ссылок «посмотреть JSON» на странице (L2-06). */
export function getPressSources(): { data: unknown; schema: unknown } {
  loadPressReleases(); // отдаём только проверенный файл
  return { data: pressFile, schema: pressSchema };
}
