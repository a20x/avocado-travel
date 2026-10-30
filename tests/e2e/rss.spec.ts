import { expect, test } from '@playwright/test';
import { ADMIN, signIn } from './helpers';

test('RSS: своя лента в RSS 2.0 и выгрузки в форматах обмена', async ({ request }) => {
  const feed = await request.get('/feed.xml');
  expect(feed.headers()['content-type']).toContain('application/rss+xml');
  expect(await feed.text()).toMatch(/<rss version="2\.0"[\s\S]*<item>/);

  const ascii = await request.get('/rss/export?format=txt&source=site');
  expect(ascii.headers()['content-disposition']).toContain('attachment');
  const text = await ascii.text();
  expect(text).toMatch(/^id\ttitle\tsummary\tpublished_at\tlink\tsource\tcategory\r\n/);
  expect(text).toMatch(/^[\x20-\x7e\t\r\n]*$/);

  expect(await (await request.get('/rss/export?format=wrapped')).text()).toContain('<payload>');
  expect(await (await request.get('/rss/export?format=xml')).text()).toContain('<news version="1"');
  expect((await request.get('/rss/export?format=csv')).headers()['content-type']).toContain(
    'text/csv',
  );
  expect((await request.get('/rss/export?format=zip')).status()).toBe(400);
});

test('RSS: загруженный файл разбирается на записи', async ({ page, request }) => {
  const feed = await (await request.get('/feed.xml')).body();
  await page.goto('/rss');
  const upload = page.getByRole('region', { name: 'Разобрать RSS-файл' });
  await upload.getByLabel('Файл ленты').setInputFiles({
    name: 'avocado.xml',
    mimeType: 'application/rss+xml',
    buffer: feed,
  });
  await upload.getByRole('button', { name: 'Разобрать' }).click();
  await expect(upload.getByRole('status')).toContainText('Файл «avocado.xml»: записей —');
  await expect(upload.getByRole('table', { name: 'Записи загруженного файла' })).toBeVisible();

  // Не лента — понятная ошибка.
  await upload.getByLabel('Файл ленты').setInputFiles({
    name: 'note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('просто текст'),
  });
  await upload.getByRole('button', { name: 'Разобрать' }).click();
  await expect(upload.getByRole('alert')).toHaveText(/нет ленты RSS или Atom/);
});

test('RSS: общая лента — новости сайта вместе с внешними, вперемешку', async ({ page }) => {
  // Замечание преподавателя по лабе 4: в общей ленте должны быть видны и новости сайта.
  await page.goto('/rss');
  await expect(page.getByLabel('Порядок')).toHaveValue('mixed');
  const composition = page.getByText(/^В общей ленте \d+ новост/);
  await expect(composition).toBeVisible();
  await expect(composition.getByRole('link', { name: /сайта Avocado Travel/ })).toHaveAttribute(
    'href',
    '/rss?source=site',
  );
  // Новость сайта — первой: внешние не вытесняют её с первой страницы.
  await expect(
    page.getByRole('article').first().getByText('Avocado Travel', { exact: true }),
  ).toBeVisible();
});

test('RSS: общая лента — поиск по источнику', async ({ page }) => {
  await page.goto('/rss?source=site');
  await expect(page.getByText(/^Найдено новостей: \d+$/)).toBeVisible();
  const badges = page.getByRole('article').getByText('Avocado Travel', { exact: true });
  await expect(badges.first()).toBeVisible();
  expect(await badges.count()).toBe(await page.getByRole('article').count());
});

test('RSS: ленты подключает только администратор, адрес внутренней сети не принимается', async ({
  page,
}) => {
  await page.goto('/rss');
  const feeds = page.getByRole('region', { name: 'Внешние RSS-ленты' });
  await expect(feeds.getByText('Подключать и отключать ленты может администратор')).toBeVisible();
  await expect(feeds.getByLabel('Адрес RSS-ленты')).toHaveCount(0);

  await page.goto('/login?next=%2Frss');
  await signIn(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL('/rss');
  await feeds.getByLabel('Адрес RSS-ленты').fill('http://127.0.0.1:3000/feed.xml');
  await feeds.getByLabel('Название источника').fill('Своя лента');
  await feeds.getByRole('button', { name: 'Подключить ленту' }).click();
  await expect(feeds.getByRole('alert')).toContainText('По адресу нет ленты RSS или Atom');
});
