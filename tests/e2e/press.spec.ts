import { expect, test } from '@playwright/test';

// «Пресс-центра» больше нет (Этап 12, замечание преподавателя одногруппнику: «дублирование
// информации на сайте — это плохо»): пресс-релизы — только на вкладке «XML».

test('старые адреса «Пресс-центра» ведут на вкладку «XML»', async ({ page, request }) => {
  const plain = await request.get('/press', { maxRedirects: 0 });
  expect(plain.status()).toBe(308);
  expect(plain.headers().location).toBe('/xml');

  // Выборка по категории сохраняется, сортировка «Пресс-центра» — нет (у таблицы своя).
  const filtered = await request.get('/press?sort=title&category=routes', { maxRedirects: 0 });
  expect(filtered.headers().location).toBe('/xml?category=routes');
  const junk = await request.get('/press?category=DROP', { maxRedirects: 0 });
  expect(junk.headers().location).toBe('/xml');

  await page.goto('/press?category=routes');
  await expect(page).toHaveURL('/xml?category=routes');
  await expect(page.getByText(/^Найдено: 4 из 18$/)).toBeVisible();
});

test('ссылка на релиз открывает его строку на «XML», полный текст — в строке', async ({ page }) => {
  // Якорь браузер переносит через переадресацию сам.
  await page.goto('/press#pr-007');
  await expect(page).toHaveURL('/xml#pr-007');
  const row = page.locator('tr#pr-007');
  await expect(row).toContainText('Кирра включает');
  await expect(row).toBeInViewport();

  // В колонке «Начало текста» — первые строки; полный текст — в раскрывающемся блоке.
  const fullText = row.locator('details').getByText('Кирра стала первой авиакомпанией сети');
  await expect(fullText).toBeHidden();
  await row.getByText('Читать полностью').click();
  await expect(fullText).toBeVisible();
});

test('тот же набор в JSON — ссылками в «Исходных файлах» вкладки «XML»', async ({
  page,
  request,
}) => {
  await page.goto('/xml');
  const sources = page.getByRole('region', { name: 'Исходные файлы' });
  await expect(sources.getByRole('link', { name: 'press-releases.json' })).toHaveAttribute(
    'href',
    '/press/press-releases.json',
  );
  await expect(sources.getByRole('link', { name: 'press-releases.schema.json' })).toHaveAttribute(
    'href',
    '/press/press-releases.schema.json',
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

test('поиск по сайту находит релиз и ведёт на вкладку «XML»; «Пресс-центра» в меню нет', async ({
  page,
}) => {
  await page.goto(`/search?q=${encodeURIComponent('Кирра включает')}`);
  const results = page.getByRole('region', { name: /^(Найдено|Ничего не нашлось)/ });
  const link = results.getByRole('link', { name: /^Пресс-релиз: Кирра включает/ });
  await expect(link).toHaveAttribute('href', '/xml#pr-007');
  await expect(results.getByRole('link', { name: 'Пресс-центр', exact: true })).toHaveCount(0);

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Пресс-центр', exact: true })).toHaveCount(0);
});
