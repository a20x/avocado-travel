import { expect, test } from '@playwright/test';

test('погода в любом городе: найти, отметить, увидеть списком и на главной, удалить', async ({
  page,
}) => {
  await page.goto('/weather');
  const main = page.getByRole('main');
  await main.getByRole('searchbox', { name: 'Город' }).fill('пари');
  await main.getByRole('button', { name: 'Найти' }).click();
  await expect(page).toHaveURL(/\/weather\?q=/);

  // Тесты не зависят от чужих сайтов: если Open-Meteo недоступен, страница честно говорит об этом.
  const results = page.getByRole('region', { name: 'Города по запросу «пари»' });
  const unavailable = page.getByText('Поиск городов сейчас недоступен');
  await expect(results.or(unavailable)).toBeVisible();
  test.skip(await unavailable.isVisible(), 'Open-Meteo сейчас недоступен');

  // По началу названия находится Париж; выбор — погода в нём сейчас и на три дня.
  await results.getByRole('link', { name: 'Париж' }).first().click();
  await expect(page).toHaveURL('/weather?city=2988507');
  const card = page.getByRole('region', { name: 'Погода: Париж' });
  await expect(card.or(page.getByText('Не удалось найти этот город'))).toBeVisible();
  test.skip(!(await card.isVisible()), 'Open-Meteo сейчас недоступен');
  await expect(card.getByText('Иль-де-Франс, Франция')).toBeVisible();

  const saved = page.getByRole('region', { name: 'Мои города' });
  await expect(saved.getByRole('link', { name: 'Париж' })).toHaveCount(0);
  await card.getByRole('button', { name: 'В мои города: Париж' }).click();
  await expect(card.getByRole('button', { name: 'Убрать из моих городов: Париж' })).toBeVisible();
  await expect(saved.getByRole('link', { name: 'Париж' })).toBeVisible();
  await expect(saved.getByText('1 из 10')).toBeVisible();

  // Отмеченные города показывает и баннер на главной. Прогноз Open-Meteo из CI отвечает
  // не всегда (общие адреса GitHub он ограничивает) — тогда в баннере заглушка.
  await page.goto('/');
  const banner = page.getByRole('region', { name: 'Погода сейчас' });
  await expect(banner.getByText('В ваших городах')).toBeVisible();
  const paris = banner.getByRole('link', { name: 'Париж' });
  await expect(paris.or(banner.getByText('Прогноз сейчас недоступен'))).toBeVisible();
  if (await paris.isVisible()) await expect(paris).toHaveAttribute('href', '/weather?city=2988507');

  // Ненужный город удаляется из списка.
  await banner.getByRole('link', { name: 'Все мои города' }).click();
  await expect(page).toHaveURL('/weather');
  await saved.getByRole('button', { name: 'Удалить Париж из моих городов' }).click();
  await expect(saved.getByRole('link', { name: 'Париж' })).toHaveCount(0);
  await expect(saved.getByText('Найдите город и нажмите «В мои города»')).toBeVisible();
});

test('без JavaScript город тоже отмечается и удаляется', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/weather?city=2988507');
  const card = page.getByRole('region', { name: 'Погода: Париж' });
  test.skip((await card.count()) === 0, 'Open-Meteo сейчас недоступен');

  await card.getByRole('button', { name: 'В мои города: Париж' }).click();
  const saved = page.getByRole('region', { name: 'Мои города' });
  await expect(saved.getByRole('link', { name: 'Париж' })).toBeVisible();
  await saved.getByRole('button', { name: 'Удалить Париж из моих городов' }).click();
  await expect(saved.getByRole('link', { name: 'Париж' })).toHaveCount(0);
  await context.close();
});
