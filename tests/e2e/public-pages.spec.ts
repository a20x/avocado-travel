import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, expectValidHtml } from './helpers';
import { PUBLIC_PAGES } from './public-pages';

for (const path of PUBLIC_PAGES) {
  test.describe(`страница ${path}`, () => {
    test('открывается без горизонтальной прокрутки', async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expectNoHorizontalScroll(page);
    });

    test('отдаёт валидный HTML', async ({ request }, testInfo) => {
      // HTML от сервера одинаков для любой ширины экрана — проверяем один раз.
      test.skip(testInfo.project.name !== 'desktop', 'HTML не зависит от ширины экрана');
      await expectValidHtml(request, path);
    });
  });
}
