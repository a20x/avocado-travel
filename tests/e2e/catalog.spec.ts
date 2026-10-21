import { expect, test } from '@playwright/test';

test('из списка направлений открывается страница города с таблицей рейсов', async ({ page }) => {
  await page.goto('/destinations');
  await page.getByRole('link', { name: 'Казань', exact: true }).click();

  await expect(page).toHaveURL('/destinations/kazan');
  await expect(page.getByRole('heading', { level: 1, name: 'Казань' })).toBeVisible();
  const routes = page.getByRole('table', { name: /Прямые рейсы/ });
  await expect(routes.getByRole('link', { name: 'Москва', exact: true })).toBeVisible();
});

test('неизвестный город — страница 404', async ({ page }) => {
  const response = await page.goto('/destinations/atlantida');
  expect(response?.status()).toBe(404);
});

test('на странице авиакомпаний есть сравнение и флот', async ({ page }) => {
  await page.goto('/airlines');
  const comparison = page.getByRole('table', { name: 'Авиакомпании на ближайшую неделю' });
  await expect(comparison.getByRole('row')).toHaveCount(7); // заголовок + 6 авиакомпаний
  await expect(page.getByRole('table', { name: 'Модели самолётов и вместимость' })).toContainText(
    'Boeing 777-300ER',
  );
});
