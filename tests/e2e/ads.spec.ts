import { expect, test } from '@playwright/test';
import { expectValidHtml, openAsAdmin } from './helpers';
import { SEARCH_DATE } from './public-pages';

test('промо-блоки на главной: только идущие кампании, клик ведёт на адрес кампании', async ({
  page,
}) => {
  await page.goto('/');
  const promo = page.getByRole('region', { name: 'Специальные предложения' });
  const sea = promo.getByRole('link', { name: /Выходные у моря/ });
  await expect(sea).toBeVisible();
  await expect(promo.getByRole('link', { name: /Бронируйте заранее/ })).toBeVisible();
  // Выключенная и завершённая кампании из демо-данных не показываются.
  await expect(promo.getByText('Осенняя распродажа')).toHaveCount(0);
  await expect(promo.getByText('Зима на Байкале')).toHaveCount(0);

  await expect(sea).toHaveAttribute('href', /^\/go\/ad\/\d+$/);
  await sea.click();
  await expect(page).toHaveURL('/destinations/sochi');
});

test('реклама в результатах поиска помечена', async ({ page }) => {
  await page.goto(`/flights?from=moscow&to=kaliningrad&date=${SEARCH_DATE}`);
  const ad = page.getByRole('link', { name: /Багаж уже в цене/ });
  await expect(ad).toBeVisible();
  await expect(ad).toContainText('Реклама');
});

test('переход по неизвестной рекламе ведёт на главную', async ({ request }) => {
  const response = await request.get('/go/ad/999999', { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(new URL(response.headers().location ?? '').pathname).toBe('/');
});

test('администратор создаёт, выключает и удаляет кампанию', async ({ page }, testInfo) => {
  const id = `${testInfo.project.name === 'mobile' ? 'm' : 'd'}${Date.now().toString(36)}`;
  const title = `Тест ${id}`;
  // Кампания — в будущем: тесты идут параллельно, и идущая кампания попадала бы в показы чужих тестов.
  const inDays = (days: number) =>
    new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  await openAsAdmin(page, '/admin/ads');
  await expectValidHtml(page, '/admin/ads');
  const sea = page.getByRole('row').filter({ hasText: 'Выходные у моря' });
  await expect(sea.getByText('показывается')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Зима на Байкале' })).toContainText(
    'завершена',
  );

  await page.getByRole('link', { name: 'Новая кампания' }).click();
  await expect(page).toHaveURL('/admin/ads/new');
  await expectValidHtml(page, '/admin/ads/new');
  await page.getByLabel('Заголовок').fill(title);
  await page.getByLabel('Текст').fill('Проверочная кампания для сквозного теста.');
  await page.getByLabel('Где показывать').selectOption({ label: 'Результаты поиска' });
  await page.getByLabel('Начало показа').fill(inDays(30));
  await page.getByLabel('Окончание показа').fill(inDays(40));
  await page.getByLabel('Ссылка').fill('//evil.example');
  await page.getByRole('button', { name: 'Создать кампанию' }).click();
  await expect(page.getByText('Нужен адрес https://… или страница сайта')).toBeVisible();
  // Выбранное место показа после ошибки не сбросилось.
  await expect(page.getByLabel('Где показывать')).toHaveValue('search');

  await page.getByLabel('Ссылка').fill('/news');
  await page.getByRole('button', { name: 'Создать кампанию' }).click();
  await expect(page).toHaveURL('/admin/ads?saved=1');
  const row = page.getByRole('row').filter({ hasText: title });
  await expect(row).toContainText('запланирована');
  await expect(row).toContainText('Результаты поиска');

  await row.getByRole('button', { name: /^Выключить/ }).click();
  await expect(row).toContainText('выключена');

  await row.getByRole('button', { name: 'Удалить' }).click();
  await page
    .getByRole('dialog', { name: 'Удалить кампанию?' })
    .getByRole('button', { name: 'Удалить' })
    .click();
  await expect(page.getByRole('row').filter({ hasText: title })).toHaveCount(0);
});
