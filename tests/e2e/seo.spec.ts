import { expect, test } from '@playwright/test';
import { expectValidHtml } from './helpers';
import { PUBLIC_PAGES } from './public-pages';

/** Значение `<meta>` по name или property. */
const meta = (html: string, key: string) =>
  html.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`))?.[1];

test.describe('метаданные и файлы для поисковиков', () => {
  // Ответы сервера не зависят от ширины экрана — проверяем один раз.
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'не зависит от экрана');
  });

  test('на главной — ключевые слова, описание и Open Graph', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(meta(html, 'keywords')).toContain('авиабилеты');
    expect(meta(html, 'description')).toBeTruthy();
    expect(meta(html, 'og:title')).toContain('Avocado Travel');
    expect(meta(html, 'og:type')).toBe('website');
    expect(meta(html, 'og:locale')).toBe('ru_RU');
  });

  test('у каждой публичной страницы своё описание и Open Graph', async ({ request }) => {
    for (const path of PUBLIC_PAGES) {
      const html = await (await request.get(path)).text();
      expect(meta(html, 'description'), path).toBeTruthy();
      expect(meta(html, 'og:title'), path).toBeTruthy();
      expect(meta(html, 'og:description'), path).toBe(meta(html, 'description'));
      // Картинка и адрес — абсолютные: мессенджеры не знают, с какого сайта пришла ссылка.
      expect(meta(html, 'og:image'), path).toMatch(/^https?:\/\/.+\/og-image\.png$/);
      expect(meta(html, 'og:url'), path).toMatch(/^https?:\/\//);
    }
  });

  test('robots.txt закрывает служебные адреса и указывает карту сайта', async ({ request }) => {
    const text = await (await request.get('/robots.txt')).text();
    expect(text).toContain('Disallow: /admin');
    expect(text).toContain('Disallow: /account');
    expect(text).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
  });

  test('sitemap.xml: каждая страница открывается и отдаёт валидный HTML', async ({ request }) => {
    test.setTimeout(180_000);
    const xml = await (await request.get('/sitemap.xml')).text();
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);

    expect(paths).toContain('/');
    expect(paths).toContain('/help');
    expect(paths).toContain('/destinations/kaliningrad');
    expect(paths).toContain('/news/avocado-travel-otkrylsya');
    expect(paths.some((path) => path.startsWith('/forum/'))).toBe(true);
    expect(paths.some((path) => path.startsWith('/admin'))).toBe(false);

    // Сайт с другим адресом в NEXT_PUBLIC_SITE_URL — проверяем путь на тестовом сервере.
    for (const path of paths) await expectValidHtml(request, path);
  });
});
