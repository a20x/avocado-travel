import { expect, test } from '@playwright/test';

test('БД: паспорт базы и пять видов запросов', async ({ page }) => {
  await page.goto('/database');
  const about = page.getByRole('region', { name: 'О базе данных Avocado Travel' });
  await expect(about.getByText('Объём базы')).toBeVisible();
  await expect(about.getByText(/^Состав:/)).toBeVisible();
  await expect(about.getByText(/^Полнота:/)).toBeVisible();
  await expect(about.getByText(/^Актуальность:/)).toBeVisible();

  const tabs = page.getByRole('navigation', { name: 'Вид запроса' }).getByRole('link');
  await expect(tabs).toHaveCount(5);
  await expect(tabs.first()).toHaveAttribute('aria-current', 'page');
});

test('БД: поиск рейсов по условиям, постранично, с текстом SQL', async ({ page }) => {
  await page.goto('/database');
  const form = page.getByRole('form', { name: 'Условия запроса' });
  await form.getByLabel('Откуда').selectOption('moscow');
  await form.getByLabel('Сортировка').selectOption('sold');
  await form.getByRole('button', { name: 'Выполнить запрос' }).click();
  await expect(page).toHaveURL(/report=flights.*from=moscow.*sort=sold/);

  const result = page.getByRole('region', { name: 'Результат запроса: Поиск рейсов' });
  const rows = result.getByRole('table').getByRole('row');
  await expect(rows).toHaveCount(21); // заголовок и 20 рейсов
  await expect(rows.nth(1).getByRole('cell').nth(2)).toContainText('Москва →');

  // Под результатом — SQL с параметрами: значение из формы — не в тексте запроса.
  const sql = page.getByRole('group').filter({ hasText: 'SQL этих запросов' });
  await expect(sql.locator('pre').first()).toContainText('where "origin"."city_slug" = $');
  await expect(sql).toContainText("= 'moscow'");

  await result.getByRole('link', { name: 'Страница 2' }).click();
  await expect(page).toHaveURL(/page=2/);
});

test('БД: связанные списки «авиакомпания — направление»', async ({ page }) => {
  await page.goto('/database?report=routes');
  const form = page.getByRole('form', { name: 'Условия запроса' });
  const destinations = form.getByLabel('Направление').locator('option');
  const all = await destinations.count();
  await form.getByLabel('Авиакомпания').selectOption({ index: 1 });
  await expect.poll(() => destinations.count()).toBeLessThan(all);

  await form.getByRole('button', { name: 'Выполнить запрос' }).click();
  await expect(page).toHaveURL(/report=routes&airline=/);
  await expect(
    page.getByRole('table', { name: 'Маршруты: рейсы, цены эконома и проданные места' }),
  ).toBeVisible();
});

test('БД: сводки с графиком и точными значениями', async ({ page }) => {
  await page.goto('/database?report=airlines');
  await expect(
    page.getByRole('table', { name: 'Точные значения: продажи по авиакомпаниям' }).getByRole('row'),
  ).not.toHaveCount(1);

  await page.goto('/database?report=months');
  await expect(
    page.getByRole('table', { name: 'Точные значения: продажи по месяцам' }),
  ).toBeVisible();

  await page.goto('/database?report=ratings');
  await expect(page.getByText('Средняя оценка')).toBeVisible();
  await expect(page.getByText(/^\d+ \/ 5$/).first()).toBeAttached();
});
