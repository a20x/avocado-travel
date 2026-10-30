import { expect, test, type Page } from '@playwright/test';
import { expectValidHtml, openAsAdmin } from './helpers';

// Сценарий преподавателя: войти, добавить город и авиакомпанию, завести между ними рейсы,
// найти их в списках и запросах вкладки «БД», затем удалить всё обратно.

/** Случайные буквы: тест можно запускать повторно на той же базе. */
const random = (alphabet: string, length: number) =>
  Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');

/** Дата через `days` дней. Рейсы — далеко впереди, чтобы не менять «ближайшую неделю» на сайте. */
const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function fillCity(page: Page, name: string, iata: string) {
  await page.getByLabel('Название города').fill(name);
  await page.getByLabel('Откуда: «из …»').fill(`${name}а`);
  await page.getByLabel('Куда: «в …»').fill(name);
  await page.getByLabel('Код аэропорта').fill(iata);
  await page.getByLabel('Название аэропорта').fill(`${name} Центральный`);
  await page.getByLabel('Широта').fill('68,78');
  await page.getByLabel('Долгота').fill('32.75');
  await page.getByRole('button', { name: 'Добавить город' }).click();
}

async function confirmDelete(page: Page, row: string) {
  await page
    .getByRole('row')
    .filter({ hasText: row })
    .getByRole('button', { name: 'Удалить' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить' }).click();
}

test('админ заводит город, авиакомпанию и рейсы — они появляются в списках и запросах', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'админка одна на оба экрана, база общая');

  const suffix = random('абвгдежзиклмнопрстуфх', 6);
  const city = `Тестоград${suffix}`;
  const iata = `Q${random('ABCDEFGHIJKLMNOPRSTUVWXYZ', 2)}`;
  const airline = `Теставиа${suffix}`;
  const code = `Z${random('ABCDEFGHIJKLMNOPRSTUVWXYZ', 2)}`;

  // Город с аэропортом.
  await openAsAdmin(page, '/admin/cities/new');
  await fillCity(page, city, iata);
  await expect(page).toHaveURL(/\/admin\/cities\?saved=/);
  await expect(page.getByRole('row').filter({ hasText: city })).toContainText(iata);

  // Тот же город второй раз не завести — даже написанный строчными буквами.
  await page.goto('/admin/cities/new');
  await fillCity(page, city.toLowerCase(), `${iata.slice(0, 2)}Z`);
  await expect(page.getByText('Такой город уже есть в списке.')).toBeVisible();

  // Авиакомпания.
  await page.goto('/admin/airlines/new');
  await page.getByLabel('Название').fill(airline);
  await page.getByLabel('Код', { exact: true }).fill(code.toLowerCase());
  await page.getByLabel('Описание').fill('Тестовые рейсы для проверки справочников.');
  await page.getByRole('button', { name: 'Добавить авиакомпанию' }).click();
  await expect(page).toHaveURL(/\/admin\/airlines\?saved=/);
  await expect(page.getByRole('row').filter({ hasText: airline })).toContainText(code);

  // Рейсы туда и обратно на неделю, каждый день.
  await page.goto('/admin/flights/new');
  await page.getByLabel('Последний день').fill('');
  await page.getByRole('button', { name: 'Создать рейсы' }).click();
  await expect(page.getByLabel('Авиакомпания')).toHaveAccessibleDescription(
    'Выберите авиакомпанию',
  );
  await expect(page.getByLabel('Последний день')).toHaveAccessibleDescription('Укажите дату');
  await page.getByLabel('Авиакомпания').selectOption({ label: airline });
  await page.getByLabel('Самолёт').selectOption({ label: 'Boeing 737-800' });
  await page.getByLabel('Откуда').selectOption(iata);
  await page.getByLabel('Куда', { exact: true }).selectOption('SVO');
  await page.getByLabel('Первый день').fill(inDays(100));
  await page.getByLabel('Последний день').fill(inDays(106));
  await page.getByRole('button', { name: 'Создать рейсы' }).click();
  await expect(page).toHaveURL('/admin/flights?created=14');

  // Новые значения — в выпадающих списках вкладки «БД», по алфавиту.
  await page.goto('/database');
  const form = page.getByRole('form', { name: 'Условия запроса' });
  const from = form.getByLabel('Откуда');
  const labels = (await from.locator('option').allTextContents()).slice(1);
  expect(labels).toContain(city);
  expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'ru')));

  // Поиск по новым значениям находит рейсы.
  await from.selectOption({ label: city });
  await form.getByLabel('Куда', { exact: true }).selectOption('moscow');
  await form.getByLabel('Авиакомпания').selectOption({ label: airline });
  await form.getByRole('button', { name: 'Выполнить запрос' }).click();
  const result = page.getByRole('region', { name: 'Результат запроса: Поиск рейсов' });
  await expect(result.getByRole('table').getByRole('row')).toHaveCount(8); // заголовок и 7 рейсов

  // Связанные списки: у новой авиакомпании — новый город среди направлений.
  await page.goto('/database?report=routes');
  const routes = page.getByRole('form', { name: 'Условия запроса' });
  await routes.getByLabel('Авиакомпания').selectOption({ label: airline });
  await expect(routes.getByLabel('Направление').locator('option')).toHaveText([
    'Все направления',
    'Москва',
    city,
  ]);

  // Город с рейсами не удалить.
  await page.goto('/admin/cities');
  await confirmDelete(page, city);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Сначала удалите рейсы');

  // Удаляем рейсы обоих направлений, потом авиакомпанию и город.
  await page.goto(`/admin/flights?airline=${code}`);
  await confirmDelete(page, `${city} (${iata}) →`);
  await expect(page).toHaveURL('/admin/flights?deleted=7');
  await page.goto(`/admin/flights?airline=${code}`);
  await confirmDelete(page, `→ ${city} (${iata})`);
  await expect(page).toHaveURL('/admin/flights?deleted=7');

  await page.goto('/admin/airlines');
  await confirmDelete(page, airline);
  await expect(page).toHaveURL('/admin/airlines?deleted=1');
  await page.goto('/admin/cities');
  await confirmDelete(page, city);
  await expect(page).toHaveURL('/admin/cities?deleted=1');
  await expect(page.getByRole('row').filter({ hasText: city })).toHaveCount(0);
});

test('страницы справочников в админке — валидный HTML', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'HTML не зависит от ширины экрана');
  await openAsAdmin(page, '/admin');
  for (const path of [
    '/admin',
    '/admin/cities',
    '/admin/cities/new',
    '/admin/cities/kazan/edit',
    '/admin/airlines',
    '/admin/airlines/new',
    '/admin/airlines/STV/edit',
    '/admin/flights?city=vladivostok',
    '/admin/flights/new',
  ]) {
    await expectValidHtml(page, path);
  }
});
