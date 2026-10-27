import { expect, test, type Page } from '@playwright/test';
import { choosePhrase } from './helpers';
import { SEARCH_DATE } from './public-pages';

const results = (page: Page) => page.getByRole('region', { name: 'Найденные рейсы' });

test('поиск-фраза на главной открывает результаты', async ({ page }) => {
  await page.goto('/');
  await choosePhrase(page, 'from', 'moscow');
  await choosePhrase(page, 'to', 'kazan');
  await page.getByLabel('Дата вылета').fill(SEARCH_DATE);
  await choosePhrase(page, 'passengers', '2');
  await page.getByRole('button', { name: 'Подобрать рейсы' }).click();

  await expect(page).toHaveURL(/\/flights\?from=moscow&to=kazan&date=.+&passengers=2/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Москва → Казань');
  await expect(results(page).getByRole('article').first()).toBeVisible();
});

test('с мышью список фразы — обычного размера и работает с клавиатуры', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'на сенсорном экране список стандартный');

  await page.goto('/');
  const to = page.getByRole('combobox', { name: 'Куда', exact: true });
  const list = page.getByRole('listbox', { name: 'Куда', exact: true });
  await to.click();
  await expect(list).toBeVisible();
  // Пункты — обычным шрифтом, а не крупным шрифтом фразы; список прокручивается внутри себя.
  const option = list.getByRole('option').first();
  expect(await option.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThan(20);
  expect((await list.boundingBox())?.height).toBeLessThan(300);
  const first = await option.getAttribute('data-value');

  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();

  // Клавиатура: Home — первый город, Enter — выбрать; набор букв — переход к городу.
  await to.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(list).toBeHidden();
  await expect(page.locator('input[name="to"]')).toHaveValue(first ?? '');

  // Playwright не нажимает русские клавиши — посылаем само событие нажатия, как браузер.
  for (const key of 'соч') await to.dispatchEvent('keydown', { key });
  await page.keyboard.press('Enter');
  await expect(page.locator('input[name="to"]')).toHaveValue('sochi');
  await expect(to).toHaveText('Сочи');
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
