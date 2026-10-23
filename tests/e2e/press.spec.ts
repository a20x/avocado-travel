import { expect, test } from '@playwright/test';

const releases = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: /пресс-релиз|Показано/ }).getByRole('article');

test('пресс-центр: сортировка и выборка меняют список и адрес', async ({ page }) => {
  await page.goto('/press');
  await expect(page.getByRole('heading', { name: '18 пресс-релизов' })).toBeVisible();
  // По умолчанию сначала новые.
  await expect(releases(page).first()).toContainText('Три месяца работы');

  await page.getByLabel('Категория').selectOption('routes');
  await page.getByLabel('Порядок').selectOption('title');
  await page.getByRole('button', { name: 'Показать' }).click();

  await expect(page).toHaveURL(/sort=title/);
  await expect(page).toHaveURL(/category=routes/);
  await expect(page.getByRole('heading', { name: 'Показано 4 из 18' })).toBeVisible();
  await expect(releases(page).first()).toContainText('Альтэйра соединит');
  await expect(page.getByLabel('Категория')).toHaveValue('routes');

  await page.getByLabel('Автор').selectOption('Ольга Ким');
  await page.getByRole('button', { name: 'Показать' }).click();
  await expect(page.getByText('Таких пресс-релизов нет')).toBeVisible();

  await page.getByRole('link', { name: 'Сбросить' }).click();
  await expect(page).toHaveURL('/press');
  await expect(releases(page)).toHaveCount(18);
});

test('пресс-релиз раскрывается целиком', async ({ page }) => {
  await page.goto('/press#pr-007');
  const release = page.getByRole('article', { name: /Кирра включает/ });
  const fullText = release.getByText('Кирра стала первой авиакомпанией сети');
  await expect(fullText).toBeHidden();
  await release.getByText('Читать полностью').click();
  await expect(fullText).toBeVisible();
});

test('на странице — ссылки на исходный JSON и его схему', async ({ page, request }) => {
  await page.goto('/press');
  const sources = page.getByRole('complementary', { name: 'Данные страницы' });
  await expect(sources.getByRole('link', { name: 'press-releases.json' })).toHaveAttribute(
    'href',
    '/press/press-releases.json',
  );

  const data = await request.get('/press/press-releases.json');
  expect(data.headers()['content-type']).toContain('application/json');
  const json = (await data.json()) as { releases: Array<Record<string, unknown>> };
  expect(json.releases).toHaveLength(18);
  expect(Object.keys(json.releases[0]!)).toEqual([
    'id',
    'title',
    'date',
    'category',
    'author',
    'summary',
    'body',
  ]);

  const schema = (await (await request.get('/press/press-releases.schema.json')).json()) as {
    title: string;
  };
  expect(schema.title).toBe('Пресс-релизы Avocado Travel');
});
