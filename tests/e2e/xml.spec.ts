import { expect, test } from '@playwright/test';
import { expectValidHtml } from './helpers';

test('вкладки лабораторных — в основном меню', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'основное меню видно на широком экране');
  await page.goto('/');
  const menu = page.getByRole('banner').getByRole('navigation', { name: 'Основное меню' });
  for (const [name, path] of [
    ['XML', '/xml'],
    ['БД', '/database'],
    ['RSS', '/rss'],
  ] as const) {
    await expect(menu.getByRole('link', { name, exact: true })).toHaveAttribute('href', path);
  }
  await menu.getByRole('link', { name: 'XML', exact: true }).click();
  await expect(page).toHaveURL('/xml');
  await expect(menu.getByRole('link', { name: 'XML', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('XML: поиск по всем колонкам, сортировка щелчком по заголовку, выбор колонок', async ({
  page,
}) => {
  await page.goto('/xml');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Таблица пресс-релизов (XML)');
  await expect(page.getByText('Найдено: 18 из 18')).toBeVisible();

  const filters = page.getByRole('form', { name: 'Поиск и сортировка' });
  await filters.getByLabel('Поиск по всем колонкам').fill('СОЧИ');
  await filters.getByRole('button', { name: 'Показать' }).click();
  await expect(page).toHaveURL(/q=%D0%A1%D0%9E%D0%A7%D0%98/);
  await expect(page.getByText(/^Найдено: [1-9]\d* из 18$/)).toBeVisible();

  // Заголовок колонки — ссылка: первый щелчок — по возрастанию, второй — по убыванию.
  const table = page.getByRole('table', { name: /семь полей/ });
  const title = table.getByRole('columnheader', { name: /Заголовок/ });
  await title.getByRole('link').click();
  await expect(title).toHaveAttribute('aria-sort', 'ascending');
  await title.getByRole('link').click();
  await expect(title).toHaveAttribute('aria-sort', 'descending');
  await expect(page).toHaveURL(/sort=title/);

  // Видимые колонки — флажками.
  await page.goto('/xml?cols=title&cols=date');
  await expect(
    page.getByRole('table', { name: /семь полей/ }).getByRole('columnheader'),
  ).toHaveCount(2);
});

test('XML: исходные файлы и XSL-преобразование на сервере', async ({ page, request }) => {
  const xml = await request.get('/xml/press-releases.xml');
  expect(xml.headers()['content-type']).toContain('text/xml');
  const text = await xml.text();
  expect(text).toContain('<?xml-stylesheet type="text/xsl" href="press-releases.xsl"?>');
  expect(text.match(/<release /g)).toHaveLength(18);
  expect((await request.get('/xml/press-releases.xsd')).headers()['content-type']).toContain('xml');
  expect((await request.get('/xml/press-releases.xsl')).headers()['content-type']).toContain('xsl');

  // «Преобразование XSL» сохраняет параметры таблицы.
  await page.goto('/xml?category=partners');
  await page.getByRole('link', { name: 'Преобразование XSL' }).click();
  await expect(page).toHaveURL('/xml/transform?category=partners');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Пресс-релизы Avocado Travel');
  await expect(page.getByText(/^Найдено: \d+ из 18$/)).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(
    1 + Number((await page.getByText(/^Найдено: /).textContent())?.match(/\d+/)?.[0]),
  );
});

test('XML: результат XSL-преобразования — валидный HTML', async ({ request }, testInfo) => {
  // Отдельная страница без шапки сайта: в общий список публичных страниц она не входит.
  test.skip(testInfo.project.name !== 'desktop', 'HTML не зависит от ширины экрана');
  await expectValidHtml(request, '/xml/transform');
  await expectValidHtml(request, '/xml/transform?category=partners&order=ascending&q=рейс');
});
