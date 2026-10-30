import { expect, test, type Page } from '@playwright/test';
import { choosePhrase } from './helpers';

// Замечание преподавателя по лабе 3: «При поиске по двум синхронизированным значениям атрибутов
// всегда должны быть результаты. Выбрал Москва — Владивосток, компания Стрива — нет результатов».
// Списки связаны: сочетания без рейсов выбрать нельзя, а для пустых дат есть ближайшие.

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'связь списков не зависит от ширины экрана');
});

/** Дата по Москве через `days` дней. */
const moscowDate = (days: number) =>
  new Date(Date.now() + 3 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);

const optionTexts = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).locator('option').allTextContents();

test('БД: Москва → Владивосток — в списке только авиакомпании, которые туда летают', async ({
  page,
}) => {
  await page.goto('/database');
  const form = page.getByRole('form', { name: 'Условия запроса' });
  await form.getByLabel('Откуда').selectOption('moscow');
  await form.getByLabel('Куда', { exact: true }).selectOption('vladivostok');

  await expect(form.getByLabel('Авиакомпания').locator('option')).toHaveText([
    'Все авиакомпании',
    'Альтэйра',
    'Ластавиа',
  ]);
  await expect(form.getByText(/^Рейсы по этим условиям — с .+, каждый день\.$/)).toBeVisible();

  await form.getByLabel('Авиакомпания').selectOption({ label: 'Ластавиа' });
  await form.getByRole('button', { name: 'Выполнить запрос' }).click();
  await expect(page).toHaveURL(/from=moscow.*to=vladivostok.*airline=LST/);
  const result = page.getByRole('region', { name: 'Результат запроса: Поиск рейсов' });
  await expect(result.getByRole('table').getByRole('row').nth(1)).toContainText(
    'Москва → Владивосток',
  );
});

test('БД: выбор в любом порядке — Стрива не предлагает Владивосток', async ({ page }) => {
  await page.goto('/database');
  const form = page.getByRole('form', { name: 'Условия запроса' });
  await form.getByLabel('Авиакомпания').selectOption({ label: 'Стрива' });
  expect(await optionTexts(page, 'Куда')).not.toContain('Владивосток');
  expect(await optionTexts(page, 'Откуда')).not.toContain('Владивосток');
});

test('БД: в выбранные даты рейсов нет — ссылки на ближайшие даты', async ({ page }) => {
  const far = moscowDate(200);
  await page.goto(
    `/database?report=flights&from=moscow&to=vladivostok&dateFrom=${far}&dateTo=${far}`,
  );
  const result = page.getByRole('region', { name: 'Результат запроса: Поиск рейсов' });
  await expect(result.getByRole('heading', { name: 'В эти даты рейсов нет' })).toBeVisible();
  await result.getByRole('link').first().click();
  await expect(result.getByRole('table').getByRole('row').nth(1)).toContainText(
    'Москва → Владивосток',
  );
});

test('Аналитика: «Направление» — только города, куда авиакомпания продавала билеты', async ({
  page,
}) => {
  await page.goto('/analytics');
  const all = await optionTexts(page, 'Направление');
  await page.getByLabel('Авиакомпания').selectOption({ label: 'Стрива' });
  await expect
    .poll(async () => (await optionTexts(page, 'Направление')).length)
    .toBeLessThan(all.length);
  expect(await optionTexts(page, 'Направление')).not.toContain('Владивосток');
});

test('Главная: из Казани в «Куда» — только города, куда из Казани летают', async ({ page }) => {
  await page.goto('/');
  await choosePhrase(page, 'from', 'kazan');
  const combobox = page.locator('#phrase-to[role="combobox"]');
  await combobox.click();
  const list = page.locator(`[id="${await combobox.getAttribute('aria-controls')}"]`);
  const destinations = await list.getByRole('option').allTextContents();
  expect(destinations).toContain('Москву');
  expect(destinations).not.toContain('Владивосток');
  expect(destinations.length).toBeLessThan(10);
  await page.keyboard.press('Escape');
  await expect(page.getByText(/^Из Казани в .+ летаем /)).toBeVisible();
});

test('Поиск: на дату без рейсов — ссылки на ближайшие даты', async ({ page }) => {
  // Санкт-Петербург → Минеральные Воды летают по пн, ср, пт и вс: ищем ближайший вторник.
  let date = moscowDate(2);
  for (let days = 2; new Date(`${date}T12:00:00Z`).getUTCDay() !== 2; days++) {
    date = moscowDate(days);
  }
  await page.goto(`/flights?from=saint-petersburg&to=mineralnye-vody&date=${date}`);
  await expect(page.getByRole('heading', { name: 'На эту дату рейсов нет' })).toBeVisible();
  await expect(page.getByText('Ближайшие рейсы:')).toBeVisible();
  await page
    .getByRole('link', { name: /^(пн|ср|пт|вс),/ })
    .first()
    .click();
  await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/);
  await expect(page.getByRole('heading', { name: 'Найденные рейсы' })).toBeAttached();
});
