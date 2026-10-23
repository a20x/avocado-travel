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

test('карта маршрутов: щелчок по городу ведёт на поиск', async ({ page }) => {
  // Картинки карты тестам не нужны — не нагружаем серверы OpenStreetMap.
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.goto('/services');
  const map = page.getByRole('region', { name: 'Карта маршрутов' });
  const moscow = map.getByRole('button', { name: 'Москва' });
  await expect(moscow).toBeVisible();

  await moscow.click();
  await map.getByRole('link', { name: 'Калининград' }).click();
  await expect(page).toHaveURL(/\/flights\?from=moscow&to=kaliningrad&date=\d{4}-\d{2}-\d{2}/);
});

test('маршруты списком работают и без карты', async ({ page }) => {
  await page.goto('/services');
  await page.getByText('Маршруты списком').click();
  const list = page.getByRole('group').filter({ hasText: 'Маршруты списком' });
  await expect(list.getByRole('term').filter({ hasText: /^Сочи$/ })).toBeVisible();
});

test('мировые часы: разница поясов между городами', async ({ page }) => {
  await page.goto('/services');
  const clock = page.getByRole('region', { name: 'Мировые часы и календарь' });
  await expect(clock.getByText('Разница поясов: +7 ч')).toBeVisible();

  await clock.getByLabel('Город прилёта').selectOption({ label: 'Калининград' });
  await expect(clock.getByText('Разница поясов: −1 ч')).toBeVisible();
  // Сегодняшний день отмечен в календаре.
  await expect(clock.locator('[aria-current="date"]')).toHaveCount(1);
});

test('на странице направления — местное время', async ({ page }) => {
  await page.goto('/destinations/vladivostok');
  await expect(page.getByText('+7 ч к Москве')).toBeVisible();
});
