import { expect, test, type Page } from '@playwright/test';
import { SEARCH_DATE } from './public-pages';

const results = (page: Page) => page.getByRole('region', { name: 'Найденные рейсы' });

test('поиск-фраза на главной открывает результаты', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Откуда', { exact: true }).selectOption('moscow');
  await page.getByLabel('Куда', { exact: true }).selectOption('kazan');
  await page.getByLabel('Дата вылета').fill(SEARCH_DATE);
  await page.getByLabel('Сколько пассажиров').selectOption('2');
  await page.getByRole('button', { name: 'Подобрать рейсы' }).click();

  await expect(page).toHaveURL(/\/flights\?from=moscow&to=kazan&date=.+&passengers=2/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Москва → Казань');
  await expect(results(page).getByRole('article').first()).toBeVisible();
});

test('сортировка и фильтр по авиакомпании меняют список', async ({ page }, testInfo) => {
  await page.goto(`/flights?from=moscow&to=saint-petersburg&date=${SEARCH_DATE}`);

  await page.getByRole('link', { name: 'ранние' }).click();
  await expect(page).toHaveURL(/sort=departure/);
  await expect(page.getByRole('link', { name: 'ранние' })).toHaveAttribute('aria-current', 'true');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Фильтры' }).click();
  }
  const filters = page.getByRole('form', { name: 'Фильтры' });
  const firstAirline = filters.getByRole('checkbox').first();
  const name = (await firstAirline.locator('xpath=..').innerText()).split('\n')[0]!.trim();
  await firstAirline.check();

  await expect(page).toHaveURL(/airlines=[A-Z]{3}/);
  await expect(page).toHaveURL(/sort=departure/);
  const cards = results(page).getByRole('article');
  await expect(cards.first()).toBeVisible();
  for (const heading of await cards.getByRole('heading').allInnerTexts()) {
    expect(heading).toBe(name);
  }
});

test('одинаковые города — понятное сообщение', async ({ page }) => {
  await page.goto(`/flights?from=moscow&to=moscow&date=${SEARCH_DATE}`);
  await expect(page.getByText('Город вылета и прилёта совпадают')).toBeVisible();
});

test('со страницы направления можно перейти к поиску', async ({ page }) => {
  await page.goto('/destinations/kazan');
  await page.getByRole('link', { name: 'Найти рейсы из города Москва' }).click();
  await expect(page).toHaveURL(/\/flights\?from=moscow&to=kazan/);
  await expect(results(page).getByRole('article').first()).toBeVisible();
});
