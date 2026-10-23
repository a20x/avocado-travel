import type { Metadata } from 'next';
import { SITE_NAME } from '@/shared/config/site';

/** Превью ссылки в мессенджерах и соцсетях — общее для всех страниц (public/images/README.md). */
export const OG_IMAGE = {
  url: '/images/brand/og-image.png',
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — авиабилеты по России и за рубеж`,
};

/** Общая часть Open Graph: тип, язык, сайт и картинка. */
export const OPEN_GRAPH_DEFAULTS = {
  type: 'website',
  locale: 'ru_RU',
  siteName: SITE_NAME,
  images: [OG_IMAGE],
} satisfies Metadata['openGraph'];

/**
 * Метаданные публичной страницы (L1-04): заголовок, описание и Open Graph с ними же.
 * Next сливает метаданные сегментов поверхностно — `openGraph` страницы целиком заменяет
 * `openGraph` макета, — поэтому общие поля Open Graph добавляются здесь в каждую страницу.
 * `path` — адрес страницы без параметров, станет og:url (абсолютным — через metadataBase).
 */
export function pageMetadata(page: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    openGraph: {
      ...OPEN_GRAPH_DEFAULTS,
      title: page.title,
      description: page.description,
      url: page.path,
    },
  };
}
