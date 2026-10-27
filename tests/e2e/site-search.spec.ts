import { expect, test, type Page } from '@playwright/test';
import { expectValidHtml, registerCustomer } from './helpers';

const results = (page: Page) => page.getByRole('region', { name: /^(Найдено|Ничего не нашлось)/ });

async function search(page: Page, q: string) {
  await page.goto(`/search?q=${encodeURIComponent(q)}`);
}

test('поиск из шапки находит слово в любой форме', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'поле поиска в шапке видно на широком экране');
  await page.goto('/');
  const field = page.getByRole('banner').getByRole('combobox', { name: 'Поиск по сайту' });
  await field.fill('багажа');
  await field.press('Enter');
  await expect(page).toHaveURL('/search?q=%D0%B1%D0%B0%D0%B3%D0%B0%D0%B6%D0%B0');
  // «багажа» находит и «багаж», и «багажу».
  await expect(
    results(page).getByRole('link', { name: 'Сколько багажа берёте в короткие поездки?' }),
  ).toBeVisible();
  await expect(results(page).getByRole('link', { name: /Кирра: багаж 23 кг/ })).toBeVisible();
  await expect(results(page).locator('mark').first()).toBeVisible();
  await expectValidHtml(page, '/search?q=багажа');
});

test('строка поиска подсказывает разделы и страницы по началу слова', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'поле поиска в шапке видно на широком экране');
  await page.goto('/airlines');
  const field = page.getByRole('banner').getByRole('combobox', { name: 'Поиск по сайту' });
  const list = page.getByRole('listbox', { name: 'Подсказки поиска' });

  await field.pressSequentially('напр');
  await expect(list.getByRole('option').first()).toContainText('Направления');
  await expect(field).toHaveAttribute('aria-expanded', 'true');

  // Стрелка вниз и Enter — переход прямо в раздел, без страницы результатов.
  await field.press('ArrowDown');
  await field.press('Enter');
  await expect(page).toHaveURL('/destinations');

  // Слово в другой форме тоже подсказывается; щелчок по подсказке открывает страницу.
  await field.fill('авиакомпания');
  await list.getByRole('option', { name: /^Авиакомпании/ }).click();
  await expect(page).toHaveURL('/airlines');

  // Последний пункт — все результаты на странице поиска; Escape закрывает подсказки.
  await field.fill('багаж');
  await expect(list.getByRole('option').last()).toHaveText('Все результаты по «багаж»');
  await field.press('Escape');
  await expect(list).toBeHidden();
});

test('раздел с названием как у запроса — первым в результатах', async ({ page }) => {
  for (const [q, title] of [
    ['направления', 'Направления'],
    ['авиакомпания', 'Авиакомпании'],
    ['форум', 'Форум'],
  ]) {
    await search(page, q!);
    await expect(results(page).getByRole('article').first().getByRole('link').first()).toHaveText(
      title!,
    );
  }
});

test('операторы И, ИЛИ, НЕ', async ({ page }) => {
  await search(page, 'багаж НЕ кирра');
  await expect(page.getByText('Ищем: «багаж», без «кирра»')).toBeVisible();
  await expect(results(page).getByRole('link', { name: /Кирра/ })).toHaveCount(0);

  await search(page, 'Калининград ИЛИ Ташкент');
  await expect(
    results(page).getByRole('link', { name: 'Калининград — направление' }),
  ).toBeVisible();
  await expect(results(page).getByRole('link', { name: 'Ташкент — направление' })).toBeVisible();

  // Вкладка «Форум» — только обсуждения.
  await search(page, 'багаж');
  await results(page)
    .getByRole('link', { name: /^Форум · \d+/ })
    .click();
  await expect(page).toHaveURL(/kind=forum/);
  await expect(results(page).getByRole('article')).toHaveCount(
    await results(page).getByText('Форум', { exact: true }).count(),
  );

  // Только «НЕ» — искать нечего.
  await search(page, 'НЕ сочи');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'нет слов, которые нужно найти',
  );
});

test('запланированная новость не ищется до даты публикации', async ({ page }) => {
  await search(page, 'новогодние каникулы');
  await expect(results(page).getByRole('link', { name: /новогодние каникулы/i })).toHaveCount(0);
});

test('новая тема форума сразу попадает в поиск', async ({ page }, testInfo) => {
  const word = `${testInfo.project.name === 'mobile' ? 'm' : 'd'}${Date.now().toString(36)}`;
  await registerCustomer(page, 'Поисковик', `finder-${testInfo.project.name}`);
  await page.goto('/forum/new');
  await page.getByLabel('Заголовок').fill(`Тема ${word}`);
  await page.getByLabel('Сообщение').fill('Проверяем, что поиск находит новые обсуждения.');
  await page.getByRole('button', { name: 'Создать тему' }).click();
  await expect(page).toHaveURL(/\/forum\/[0-9a-f-]{36}/);

  await search(page, word);
  await expect(results(page).getByRole('link', { name: `Тема ${word}` })).toBeVisible();
});
