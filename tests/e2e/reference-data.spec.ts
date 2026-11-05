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
  await page.getByLabel('Часть света').selectOption({ label: 'Европа' });
  await page.getByLabel('Откуда: «из …»').fill(`${name}а`);
  await page.getByLabel('Куда: «в …»').fill(name);
  await page.getByLabel('Код аэропорта').fill(iata);
  await page.getByLabel('Название аэропорта').fill(`${name} Центральный`);
  await page.getByLabel('Широта').fill('68,78');
  await page.getByLabel('Долгота').fill('32.75');
  await page.getByRole('button', { name: 'Добавить город' }).click();
}

/** Списки новой авиакомпании; страна по умолчанию — Россия. */
async function chooseAirlineLists(page: Page) {
  await page.getByLabel('Тип авиакомпании').selectOption({ label: 'Лоукост' });
  await page.getByLabel('Базовый город').selectOption('moscow');
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
  await chooseAirlineLists(page);
  await page.getByRole('button', { name: 'Добавить авиакомпанию' }).click();
  await expect(page).toHaveURL(/\/admin\/airlines\?saved=/);
  await expect(page.getByRole('row').filter({ hasText: airline })).toContainText(code);

  // Агрегация: авиакомпания без рейсов — с нулями.
  await page.goto('/database?report=schedule');
  const schedule = page.getByRole('table', { name: 'Точные значения: рейсы по авиакомпаниям' });
  const scheduleRow = schedule.getByRole('row').filter({ hasText: airline });
  await expect(scheduleRow.getByRole('cell').nth(1)).toHaveText('0');
  const totalBefore = Number(
    (await schedule.locator('tfoot td').nth(1).textContent())?.replace(/\D/g, ''),
  );

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

  // Агрегация: после ввода — 14 рейсов на двух маршрутах, итог вырос на 14.
  await page.goto('/database?report=schedule');
  await expect(scheduleRow.getByRole('cell')).toHaveText([airline, '14', '14', '2', /₽/, /₽/, /₽/]);
  await expect(schedule.locator('tfoot td').nth(1)).toHaveText(
    new Intl.NumberFormat('ru-RU').format(totalBefore + 14),
  );

  // Поиск по одному атрибуту: новая авиакомпания — в списке по алфавиту, находит свои рейсы.
  await page.goto('/database');
  const single = page.getByRole('form', { name: 'Условия запроса' });
  const singleLabels = await single.getByLabel('Авиакомпания').locator('option').allTextContents();
  expect(singleLabels).toContain(airline);
  expect(singleLabels).toEqual([...singleLabels].sort((a, b) => a.localeCompare(b, 'ru')));
  await single.getByLabel('Авиакомпания').selectOption({ label: airline });
  await single.getByRole('button', { name: 'Выполнить запрос' }).click();
  await expect(
    page
      .getByRole('region', { name: 'Результат запроса: Рейсы авиакомпании' })
      .getByRole('table')
      .getByRole('row'),
  ).toHaveCount(15); // заголовок и 14 рейсов

  // Новые значения — в выпадающих списках поиска рейсов, по алфавиту.
  await page.goto('/database?report=flights');
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

test('кнопки «Добавить» у списков формы рейсов возвращают с новым значением; дубли не заводятся', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'админка одна на оба экрана, база общая');

  const suffix = random('абвгдежзиклмнопрстуфх', 6);
  const city = `Дублеград${suffix}`;
  const iata = `X${random('ABCDEFGHIJKLMNOPRSTUVWXYZ', 2)}`;
  const airline = `Дублавиа${suffix}`;
  const code = `Y${random('ABCDEFGHIJKLMNOPRSTUVWXYZ', 2)}`;

  // «+ Добавить» у авиакомпании → форма авиакомпании → обратно, она уже выбрана.
  await openAsAdmin(page, '/admin/flights/new');
  await page.getByRole('link', { name: '+ Добавить авиакомпанию' }).click();
  await expect(page).toHaveURL('/admin/airlines/new?return=flights-airline');
  await page.getByLabel('Название').fill(airline);
  await page.getByLabel('Код', { exact: true }).fill(code);
  await page.getByLabel('Описание').fill('Проверка кнопки «Добавить» и дублей рейсов.');
  await chooseAirlineLists(page);
  await page.getByRole('button', { name: 'Добавить авиакомпанию' }).click();
  await expect(page).toHaveURL(`/admin/flights/new?airline=${code}`);
  await expect(page.getByLabel('Авиакомпания')).toHaveValue(code);

  // «+ Добавить» у «Куда» → новый город с аэропортом → обратно, аэропорт выбран в «Куда».
  await page.getByRole('link', { name: '+ Добавить город прилёта' }).click();
  await expect(page).toHaveURL('/admin/cities/new?return=flights-destination');
  await fillCity(page, city, iata);
  await expect(page).toHaveURL(`/admin/flights/new?destination=${iata}`);
  await expect(page.getByLabel('Куда', { exact: true })).toHaveValue(iata);

  // Рейсы туда и обратно на два дня, затем та же форма ещё раз — дубль.
  const fillFlights = async () => {
    await page.getByLabel('Авиакомпания').selectOption(code);
    await page.getByLabel('Самолёт').selectOption({ label: 'Boeing 737-800' });
    await page.getByLabel('Откуда').selectOption('SVO');
    await page.getByLabel('Куда', { exact: true }).selectOption(iata);
    await page.getByLabel('Первый день').fill(inDays(120));
    await page.getByLabel('Последний день').fill(inDays(121));
    await page.getByRole('button', { name: 'Создать рейсы' }).click();
  };
  await fillFlights();
  await expect(page).toHaveURL('/admin/flights?created=4');

  await page.goto('/admin/flights/new');
  await fillFlights();
  await expect(
    page.getByRole('alert').filter({ hasText: /^Все 4 рейса уже заведены/ }),
  ).toBeVisible();
  await expect(page).toHaveURL('/admin/flights/new');

  // Убираем за собой.
  await page.goto(`/admin/flights?airline=${code}`);
  await confirmDelete(page, `→ ${city} (${iata})`);
  await expect(page).toHaveURL('/admin/flights?deleted=2');
  await page.goto(`/admin/flights?airline=${code}`);
  await confirmDelete(page, `${city} (${iata}) →`);
  await expect(page).toHaveURL('/admin/flights?deleted=2');
  await page.goto('/admin/airlines');
  await confirmDelete(page, airline);
  await expect(page).toHaveURL('/admin/airlines?deleted=1');
  await page.goto('/admin/cities');
  await confirmDelete(page, city);
  await expect(page).toHaveURL('/admin/cities?deleted=1');
});

test('списки форм города и авиакомпании: «+ Добавить» и новые значения в поиске', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'админка одна на оба экрана, база общая');

  const suffix = random('абвгдежзиклмнопрстуфх', 6);
  const country = `Страна${suffix}`;
  const part = `Материк${suffix}`;
  const type = `Тип${suffix}`;
  const city = `Списокград${suffix}`;
  const base = `Базоград${suffix}`;
  const airline = `Списокавиа${suffix}`;
  const code = `W${random('ABCDEFGHIJKLMNOPRSTUVWXYZ', 2)}`;
  const iata = `J${random('ABCDEFGHIJKLMNOPRSTUVWXYZ', 2)}`;
  const baseIata = `K${random('ABCDEFGHIJKLMNOPRSTUVWXYZ', 2)}`;

  /** Открывает окно кнопки «+ Добавить», сохраняет значение; окно закрывается. */
  const addValue = async (button: string, value: string) => {
    await page.getByRole('button', { name: `+ Добавить ${button}` }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill(value);
    await dialog.getByRole('button', { name: 'Сохранить' }).click();
    await expect(dialog).toHaveCount(0);
  };

  // Форма города: введённое название остаётся, пока добавляются значения списков.
  await openAsAdmin(page, '/admin/cities/new');
  await page.getByLabel('Название города').fill(city);

  // Пустое значение и несуществующий часовой пояс не сохраняются.
  await page.getByRole('button', { name: '+ Добавить страну' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByRole('dialog').getByRole('textbox')).toHaveAccessibleDescription(
    /от 2 символов/,
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click();
  await page.getByRole('button', { name: '+ Добавить часовой пояс' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Обнинск');
  await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByRole('dialog').getByRole('textbox')).toHaveAccessibleDescription(
    /Такого часового пояса нет/,
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click();

  // Новое значение сразу выбрано и стоит в списке по алфавиту.
  await addValue('страну', country);
  await expect(page.getByLabel('Страна')).toHaveValue(country);
  await expect(page.getByLabel('Название города')).toHaveValue(city);
  const countries = await page.getByLabel('Страна').locator('option').allTextContents();
  expect(countries.slice(1)).toEqual(
    [...countries.slice(1)].sort((a, b) => a.localeCompare(b, 'ru')),
  );

  // То же значение другими буквами — не дубль, выбирается уже имеющееся.
  await addValue('страну', country.toUpperCase());
  await expect(page.getByLabel('Страна')).toHaveValue(country);
  await expect(page.getByLabel('Страна').locator('option', { hasText: country })).toHaveCount(1);

  await addValue('часть света', part);
  await expect(page.getByLabel('Часть света')).toHaveValue(part);

  // Ошибка в форме не сбрасывает новое значение в списке.
  await page.getByRole('button', { name: 'Добавить город' }).click();
  await expect(page.getByLabel('Код аэропорта')).toHaveAccessibleDescription(/три латинские/);
  await expect(page.getByLabel('Страна')).toHaveValue(country);
  await expect(page.getByLabel('Часть света')).toHaveValue(part);

  await page.getByLabel('Откуда: «из …»').fill(`${city}а`);
  await page.getByLabel('Куда: «в …»').fill(city);
  await page.getByLabel('Код аэропорта').fill(iata);
  await page.getByLabel('Название аэропорта').fill(`${city} Центральный`);
  await page.getByLabel('Широта').fill('68,78');
  await page.getByLabel('Долгота').fill('32.75');
  await page.getByRole('button', { name: 'Добавить город' }).click();
  await expect(page).toHaveURL(/\/admin\/cities\?saved=/);
  await expect(page.getByRole('row').filter({ hasText: city })).toContainText(part);

  // Новая страна — в списках формы авиакомпании. «+ Добавить» у базового города: вся форма города
  // в окне, новый город выбран, введённое в форме авиакомпании на месте.
  await page.goto('/admin/airlines/new');
  await expect(page.getByLabel('Страна').locator('option', { hasText: country })).toHaveCount(1);
  await page.getByLabel('Название', { exact: true }).fill(airline);
  await addValue('тип авиакомпании', type);
  await page.getByRole('button', { name: '+ Добавить базовый город' }).click();
  const cityDialog = page.getByRole('dialog', { name: 'Новый город' });
  await cityDialog.getByLabel('Название города').fill(base);
  await cityDialog.getByLabel('Часть света').selectOption({ label: 'Азия' });
  await cityDialog.getByLabel('Откуда: «из …»').fill(`${base}а`);
  await cityDialog.getByLabel('Куда: «в …»').fill(base);
  await cityDialog.getByLabel('Код аэропорта').fill(baseIata);
  await cityDialog.getByLabel('Название аэропорта').fill(`${base} Центральный`);
  await cityDialog.getByLabel('Широта').fill('43');
  await cityDialog.getByLabel('Долгота').fill('132');
  await cityDialog.getByRole('button', { name: 'Добавить город' }).click();
  await expect(cityDialog).toHaveCount(0);
  await expect(page.getByLabel('Базовый город').locator('option:checked')).toHaveText(base);
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue(airline);
  await expect(page.getByLabel('Тип авиакомпании')).toHaveValue(type);

  await page.getByLabel('Страна').selectOption({ label: country });
  await page.getByLabel('Код', { exact: true }).fill(code);
  await page.getByLabel('Описание').fill('Проверка списков авиакомпании.');
  await page.getByRole('button', { name: 'Добавить авиакомпанию' }).click();
  await expect(page).toHaveURL(/\/admin\/airlines\?saved=/);
  await expect(page.getByRole('row').filter({ hasText: airline })).toContainText(base);

  // Поиск по двум атрибутам: новые значения в списках сразу, без рейсов; результат есть всегда.
  const search = page.getByRole('form', { name: 'Условия запроса' });
  await page.goto('/database?report=countryCity');
  await search.getByLabel('Страна').selectOption({ label: country });
  await expect(search.getByLabel('Город').locator('option')).toHaveText(['Все города', city]);
  await search.getByRole('button', { name: 'Выполнить запрос' }).click();
  await expect(page.getByRole('table', { name: 'Города по выбранным условиям' })).toContainText(
    iata,
  );

  await page.goto('/database?report=partZone');
  await search.getByLabel('Часть света').selectOption({ label: part });
  await search.getByRole('button', { name: 'Выполнить запрос' }).click();
  await expect(page.getByRole('table', { name: 'Города по выбранным условиям' })).toContainText(
    city,
  );

  await page.goto('/database?report=countryAirline');
  await search.getByLabel('Страна').selectOption({ label: country });
  await expect(search.getByLabel('Авиакомпания').locator('option')).toHaveText([
    'Все авиакомпании',
    airline,
  ]);

  await page.goto('/database?report=typeAirline');
  await search.getByLabel('Тип авиакомпании').selectOption({ label: type });
  await search.getByRole('button', { name: 'Выполнить запрос' }).click();
  await expect(
    page.getByRole('table', { name: 'Авиакомпании по выбранным условиям' }),
  ).toContainText(airline);

  // Базовый город авиакомпании не удалить, пока она есть.
  await page.goto('/admin/cities');
  await confirmDelete(page, base);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('базовый у авиакомпании');

  // Убираем за собой.
  await page.goto('/admin/airlines');
  await confirmDelete(page, airline);
  await expect(page).toHaveURL('/admin/airlines?deleted=1');
  for (const name of [city, base]) {
    await page.goto('/admin/cities');
    await confirmDelete(page, name);
    await expect(page).toHaveURL('/admin/cities?deleted=1');
  }
});

test('админ правит один рейс и все рейсы маршрута; правка видна из поиска на вкладке «БД»', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'админка одна на оба экрана, база общая');

  // Своя авиакомпания на существующем маршруте Москва → Дубай: города не заводим.
  const airline = `Прававиа${random('абвгдежзиклмнопрстуфх', 6)}`;
  const code = `V${random('ABCDEFGHIJKLMNOPRSTUVWXYZ', 2)}`;

  await openAsAdmin(page, '/admin/airlines/new');
  await page.getByLabel('Название').fill(airline);
  await page.getByLabel('Код', { exact: true }).fill(code);
  await page.getByLabel('Описание').fill('Проверка правки рейсов.');
  await chooseAirlineLists(page);
  await page.getByRole('button', { name: 'Добавить авиакомпанию' }).click();
  await expect(page).toHaveURL(/\/admin\/airlines\?saved=/);
  await page.goto(`/admin/flights/new?airline=${code}&origin=SVO&destination=DXB`);
  await page.getByLabel('Самолёт').selectOption({ label: 'Boeing 737-800' });
  await page.getByLabel('Первый день').fill(inDays(140));
  await page.getByLabel('Последний день').fill(inDays(142));
  await page.getByRole('button', { name: 'Создать рейсы' }).click();
  await expect(page).toHaveURL('/admin/flights?created=6');

  // Таблица маршрутов → «Рейсы» → список предстоящих рейсов с «Изменить».
  await page.goto(`/admin/flights?airline=${code}`);
  await page
    .getByRole('row')
    .filter({ hasText: '(SVO) →' })
    .getByRole('link', { name: /^Рейсы/ })
    .click();
  await expect(page).toHaveURL(`/admin/flights/route?airline=${code}&origin=SVO&destination=DXB`);
  const table = page.getByRole('table', { name: /^Предстоящие рейсы/ });
  await expect(table.getByRole('row')).toHaveCount(4); // заголовок и 3 рейса

  // Один рейс: время и цена эконома.
  await table
    .getByRole('link', { name: /^Изменить рейс/ })
    .first()
    .click();
  await expect(page).toHaveURL(
    /\/admin\/flights\/[0-9a-f-]{36}\/edit\?back=%2Fadmin%2Fflights%2Froute/,
  );
  await page.getByLabel('Время вылета').fill('11:15');
  await page.getByLabel('Цена эконома, ₽').fill('9999');
  await page.getByRole('button', { name: 'Сохранить рейс' }).click();
  await expect(page).toHaveURL(/\/admin\/flights\/route\?.*saved=1/);
  await expect(table.getByRole('row').nth(1)).toContainText('11:15');
  await expect(table.getByRole('row').nth(1)).toContainText(/9\s999/);

  // Второй рейс в то же время того же дня — дубль, не сохраняется.
  await table
    .getByRole('link', { name: /^Изменить рейс/ })
    .nth(1)
    .click();
  await page.getByLabel('Дата вылета').fill(inDays(140));
  await page.getByLabel('Время вылета').fill('11:15');
  await page.getByRole('button', { name: 'Сохранить рейс' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'уже вылетает' })).toBeVisible();
  await page.getByRole('link', { name: '← Рейсы маршрута' }).click();

  // Все предстоящие рейсы маршрута: пустая форма — ошибка, цена бизнеса — у всех трёх.
  await page.getByRole('link', { name: 'Изменить все предстоящие рейсы' }).click();
  await page.getByRole('button', { name: 'Изменить все предстоящие рейсы' }).click();
  await expect(page.getByText('Заполните хотя бы одно поле — пустые не меняются')).toBeVisible();
  await page.getByLabel('Цена бизнеса, ₽').fill('30000');
  await page.getByRole('button', { name: 'Изменить все предстоящие рейсы' }).click();
  await expect(page).toHaveURL(/\/admin\/flights\/route\?.*updated=3/);
  for (const index of [1, 2, 3]) {
    await expect(table.getByRole('row').nth(index)).toContainText(/30\s000/);
  }

  // Из поиска на вкладке «БД» администратор переходит к правке рейса.
  await page.goto(`/database?report=airline&airline=${code}`);
  const result = page.getByRole('region', { name: 'Результат запроса: Рейсы авиакомпании' });
  await expect(result.getByRole('link', { name: /^Изменить рейс/ })).toHaveCount(6);
  await result
    .getByRole('link', { name: /^Изменить рейс/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`${code} `);

  // «←» и сохранение возвращают к тем же результатам вкладки «БД», а не в админку.
  await page.getByRole('link', { name: '← К результатам запроса' }).click();
  await expect(page).toHaveURL(`/database?report=airline&airline=${code}`);
  await result
    .getByRole('link', { name: /^Изменить рейс/ })
    .first()
    .click();
  await page.getByLabel('Цена эконома, ₽').fill('8888');
  await page.getByRole('button', { name: 'Сохранить рейс' }).click();
  await expect(page).toHaveURL(`/database?report=airline&airline=${code}&saved=1`);
  await expect(page.getByRole('status').filter({ hasText: 'Рейс изменён.' })).toBeVisible();
  await expect(result.getByRole('row').nth(1)).toContainText(/8\s888/);

  // Убираем за собой.
  await page.goto(`/admin/flights?airline=${code}`);
  await confirmDelete(page, '(SVO) →');
  await expect(page).toHaveURL('/admin/flights?deleted=3');
  await page.goto(`/admin/flights?airline=${code}`);
  await confirmDelete(page, '(DXB) →');
  await expect(page).toHaveURL('/admin/flights?deleted=3');
  await page.goto('/admin/airlines');
  await confirmDelete(page, airline);
  await expect(page).toHaveURL('/admin/airlines?deleted=1');
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
    '/admin/flights/new?airline=STV&destination=SVO',
    '/admin/cities/new?return=flights-origin',
    '/admin/airlines/new?return=flights-airline',
    '/admin/flights/route?airline=ALT&origin=SVO&destination=DXB',
    '/admin/flights/route/edit?airline=ALT&origin=SVO&destination=DXB',
  ]) {
    await expectValidHtml(page, path);
  }
});
