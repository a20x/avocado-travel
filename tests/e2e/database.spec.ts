import { expect, test } from '@playwright/test';

test('БД: меню разделов словами преподавателя, первым — поиск по одному атрибуту', async ({
  page,
}) => {
  await page.goto('/database');
  const menu = page.getByRole('navigation', { name: 'Разделы базы данных' }).getByRole('link');
  await expect(menu).toHaveText([
    'Ввод',
    'Поиск по одному атрибуту',
    'Поиск по двум атрибутам',
    'Агрегация',
    'Сведения о БД',
    'Поиск рейсов',
  ]);
  await expect(menu.nth(1)).toHaveAttribute('aria-current', 'page');

  // Сразу — результат: в списке выбрана первая авиакомпания, её рейсы найдены.
  const result = page.getByRole('region', { name: 'Результат запроса: Рейсы авиакомпании' });
  await expect(result.getByRole('table').getByRole('row')).toHaveCount(21);
  const sql = page.getByRole('group').filter({ hasText: 'SQL этих запросов' });
  await expect(sql.locator('pre').first()).toContainText('select distinct');

  await menu.getByText('Сведения о БД').click();
  const about = page.getByRole('region', { name: 'Сведения о базе данных Avocado Travel' });
  await expect(about.getByText('Объём базы')).toBeVisible();
  await expect(about.getByText(/^Состав:/)).toBeVisible();
  await expect(about.getByText(/^Полнота:/)).toBeVisible();
  await expect(about.getByText(/^Актуальность:/)).toBeVisible();

  await menu.getByText('Ввод', { exact: true }).click();
  const input = page.getByRole('region', { name: 'Ввод данных' });
  await expect(input.getByRole('link', { name: 'Добавить рейсы' })).toHaveAttribute(
    'href',
    '/admin/flights/new',
  );
  await expect(input.getByRole('link', { name: 'Войти как администратор' })).toBeVisible();

  await menu.getByText('Агрегация').click();
  await expect(
    page.getByRole('navigation', { name: 'Вид агрегации' }).getByRole('link'),
  ).toHaveText([
    'Рейсы по авиакомпаниям',
    'Продажи по авиакомпаниям',
    'Динамика продаж',
    'Оценки сайта',
  ]);
  const schedule = page.getByRole('table', { name: 'Точные значения: рейсы по авиакомпаниям' });
  await expect(schedule.locator('tfoot')).toContainText('Итого');
});

test('БД: поиск рейсов по условиям, постранично, с текстом SQL', async ({ page }) => {
  await page.goto('/database?report=flights');
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

test('БД: даты сводок — только в периоде продаж, пустого результата из-за дат нет', async ({
  page,
}) => {
  // Период целиком после продаж — сервер подтягивает его к последнему дню продаж.
  await page.goto('/database?report=airlines&dateFrom=2035-01-01&dateTo=2035-02-01');
  const form = page.getByRole('form', { name: 'Условия запроса' });
  const from = form.getByLabel('Заказы с даты');
  const to = form.getByLabel('По дату включительно');
  const last = await from.getAttribute('max');
  expect(last).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(await from.getAttribute('min')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await expect(from).toHaveValue(last!);
  await expect(to).toHaveValue(last!);
  await expect(
    form.getByText(/^Продажи есть с .+ по .+ — даты выбираются в этих границах\.$/),
  ).toBeVisible();
  await expect(
    page.getByRole('table', { name: 'Точные значения: продажи по авиакомпаниям' }).getByRole('row'),
  ).not.toHaveCount(1);

  // «Динамика»: в списке только авиакомпании с продажами, у каждой — свой период.
  await page.goto('/database?report=months');
  const months = page.getByRole('form', { name: 'Условия запроса' });
  const options = await months.getByLabel('Авиакомпания').locator('option').allTextContents();
  expect(options[0]).toBe('Все авиакомпании');
  expect(options.length).toBeGreaterThan(1);
  await months.getByLabel('Авиакомпания').selectOption({ index: 1 });
  await expect(months.getByText(/^Продажи есть с /)).toBeVisible();
  await months.getByRole('button', { name: 'Выполнить запрос' }).click();
  await expect(
    page.getByRole('table', { name: 'Точные значения: продажи по месяцам' }).getByRole('row'),
  ).not.toHaveCount(1);
});
