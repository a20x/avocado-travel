import { expect, test } from '@playwright/test';

/*
 * Курсы и погода приходят из внешних сервисов (ЦБ, Open-Meteo). Если сервис недоступен —
 * например, в CI, — сайт показывает заглушку. Тесты проверяют оба исхода, а пересчёт
 * конвертера — только когда курсы получены.
 */

test('курсы ЦБ в подвале и конвертер на странице сервисов', async ({ page }) => {
  await page.goto('/');
  const banner = page.getByRole('region', { name: /^Курсы ЦБ/ });
  await expect(banner.getByText(/USD|недоступны/).first()).toBeVisible();

  await banner.getByRole('link', { name: 'Конвертер валют' }).click();
  await expect(page).toHaveURL('/services#converter');
  const converter = page.getByRole('region', { name: 'Конвертер валют' });
  const table = converter.getByRole('table');
  test.skip((await table.count()) === 0, 'Курсы ЦБ сейчас недоступны — пересчитать нечего');

  // Пересчёт сразу при вводе, без отправки формы.
  await converter.getByLabel('Сумма в рублях').fill('8 000');
  await expect(table).toHaveAccessibleName('8 000 ₽ по курсу ЦБ');
  await expect(table.getByRole('row').filter({ hasText: 'Доллар США' })).toContainText('$');

  await converter.getByLabel('Сумма в рублях').fill('ноль');
  await expect(converter.getByText('Введите сумму больше нуля')).toBeVisible();
});

test('сумма из адреса подставляется в конвертер', async ({ page }) => {
  await page.goto('/services?amount=12500');
  const field = page.getByRole('region', { name: 'Конвертер валют' }).getByLabel('Сумма в рублях');
  test.skip((await field.count()) === 0, 'Курсы ЦБ сейчас недоступны');
  await expect(field).toHaveValue('12500');
});

test('погода на главной и на странице направления', async ({ page }) => {
  await page.goto('/');
  const weather = page.getByRole('region', { name: 'Погода сейчас' });
  await expect(weather.getByText(/Калининград|недоступен/).first()).toBeVisible();

  await page.goto('/destinations/sochi');
  await expect(
    page
      .getByRole('region', { name: /^Погода/ })
      .getByText(/°|недоступен/)
      .first(),
  ).toBeVisible();
});
