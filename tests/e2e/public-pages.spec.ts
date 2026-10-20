import { expect, test } from '@playwright/test';
import { HtmlValidate, formatterFactory } from 'html-validate';
import { PUBLIC_PAGES } from './public-pages';

// standard — правила валидности HTML (то, что проверяет валидатор W3C), a11y — базовая доступность.
const htmlValidate = new HtmlValidate({
  extends: ['html-validate:standard', 'html-validate:a11y'],
});
const formatReport = formatterFactory('stylish');

for (const path of PUBLIC_PAGES) {
  test.describe(`страница ${path}`, () => {
    test('открывается без горизонтальной прокрутки', async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'страница шире экрана').toBeLessThanOrEqual(0);
    });

    test('отдаёт валидный HTML', async ({ request }, testInfo) => {
      // HTML от сервера одинаков для любой ширины экрана — проверяем один раз.
      test.skip(testInfo.project.name !== 'desktop', 'HTML не зависит от ширины экрана');

      const response = await request.get(path);
      const report = await htmlValidate.validateString(await response.text());

      expect(report.valid, formatReport(report.results)).toBe(true);
    });
  });
}
