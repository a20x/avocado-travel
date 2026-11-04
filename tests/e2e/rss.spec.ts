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
  await page.goto('/rss?view=upload');
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
  await page.goto('/rss?view=search');
  await expect(page.getByLabel('Порядок')).toHaveValue('mixed');
  const composition = page.getByText(/^В общей ленте \d+ новост/);
  await expect(composition).toBeVisible();
  await expect(composition.getByRole('link', { name: /сайта Avocado Travel/ })).toHaveAttribute(
    'href',
    '/rss?view=search&source=site',
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
  await page.goto('/rss?view=feeds');
  const feeds = page.getByRole('region', { name: 'Внешние RSS-ленты' });
  await expect(feeds.getByText(/может только администратор/)).toBeVisible();
  await expect(feeds.getByLabel('Адрес RSS-ленты')).toHaveCount(0);

  await page.goto('/login?next=%2Frss%3Fview%3Dfeeds');
  await signIn(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL('/rss?view=feeds');
  await feeds.getByLabel('Адрес RSS-ленты').fill('http://127.0.0.1:3000/feed.xml');
  await feeds.getByLabel('Название источника').fill('Своя лента');
  await feeds.getByRole('button', { name: 'Подключить ленту' }).click();
  await expect(feeds.getByRole('alert')).toContainText('По адресу нет ленты RSS или Atom');
});

test('RSS: объединённые новости — первый блок вкладки, поле для адреса любой ленты', async ({
  page,
}) => {
  // Замечание преподавателя по лабе 4: форма ввода любой RSS-ленты и страница, где новости
  // сайта объединены с новостями этой ленты, — без входа и первой на вкладке.
  await page.goto('/rss');
  const merged = page.getByRole('region', { name: /^Объединённые новости/ });
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
    'Объединённые новости: сайт + любая RSS-лента',
  );
  const field = merged.getByLabel('Адрес RSS-ленты');
  await expect(field).toBeVisible();

  // Адрес внутренней сети сайт не скачивает (защита от SSRF) — понятная ошибка, а не сбой.
  await field.fill('http://127.0.0.1:3000/feed.xml');
  await merged.getByRole('button', { name: 'Объединить' }).click();
  await expect(page).toHaveURL(/\/rss\?feed=http%3A%2F%2F127\.0\.0\.1%3A3000%2Ffeed\.xml#merged$/);
  await expect(merged.getByRole('alert')).toContainText('По этому адресу нет ленты RSS или Atom');
  await expect(field).toHaveValue('http://127.0.0.1:3000/feed.xml');
});

test('RSS: объединённые новости — неверный адрес объясняется', async ({ page }) => {
  await page.goto('/rss?feed=ftp%3A%2F%2Fexample.com%2Frss#merged');
  const merged = page.getByRole('region', { name: /^Объединённые новости/ });
  await expect(merged.getByRole('alert')).toContainText('https://example.com/rss.xml');
});

test('RSS: меню разделов, первыми — объединённые новости со значком RSS', async ({
  page,
  request,
}) => {
  // Замечание преподавателя одногруппнику: ввод новостей, ввод RSS-ленты, поиск и объединённые
  // новости — в одном месте с понятными названиями; под объединёнными новостями — значок RSS.
  await page.goto('/rss');
  const menu = page.getByRole('navigation', { name: 'Разделы RSS' }).getByRole('link');
  await expect(menu).toHaveText([
    'Объединённые новости',
    'Ввод новостей сайта',
    'Подключить RSS-ленту',
    'Поиск по новостям',
    'Выгрузка и подписка',
    'Разбор RSS-файла',
  ]);
  await expect(menu.first()).toHaveAttribute('aria-current', 'page');

  // Пока адрес не введён — новости сайта и подключённых лент вместе, под ними значок RSS.
  const preview = page.getByRole('region', { name: 'Новости сайта и подключённых RSS-лент' });
  await expect(preview.getByText(/^В общей ленте \d+ новост/)).toBeVisible();
  const rss = preview.getByRole('link', { name: 'Объединённые новости в формате RSS' });
  const href = await rss.getAttribute('href');
  expect(href).toBe('/rss/export?format=rss');
  const feed = await request.get(href!);
  expect(feed.headers()['content-type']).toContain('application/rss+xml');
  expect(await feed.text()).toMatch(/<rss version="2\.0"[\s\S]*<item>/);

  await menu.getByText('Выгрузка и подписка').click();
  await expect(page.getByRole('region', { name: 'Скачать новости' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'RSS-подписка Avocado Travel' })).toBeVisible();
});

test('RSS: объединённые новости в RSS по адресу ленты — ошибки понятны', async ({ request }) => {
  const wrong = await request.get('/rss/merged?feed=ftp%3A%2F%2Fexample.com%2Frss');
  expect(wrong.status()).toBe(400);
  expect(await wrong.text()).toContain('https://example.com/rss.xml');
  // Адрес внутренней сети сайт не скачивает (защита от SSRF).
  const inner = await request.get('/rss/merged?feed=http%3A%2F%2F127.0.0.1%3A3000%2Ffeed.xml');
  expect(inner.status()).toBe(422);
});

test('RSS: ввод новостей сайта — гостю вход, администратор пишет новость прямо здесь', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'база общая, новость одна на оба экрана');

  await page.goto('/rss?view=input');
  await expect(page.getByRole('link', { name: 'Войти как администратор' })).toHaveAttribute(
    'href',
    '/login?next=%2Frss%3Fview%3Dinput',
  );

  const title = `Новость с вкладки RSS ${Date.now()}`;
  await page.getByRole('link', { name: 'Войти как администратор' }).click();
  await signIn(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL('/rss?view=input');
  await page.getByLabel('Заголовок').fill(title);
  await page.getByLabel('Кратко').fill('Проверка ввода новости на вкладке RSS.');
  await page.getByLabel('Текст').fill('Новость сайта появляется среди объединённых новостей.');
  await page.getByRole('button', { name: 'Опубликовать' }).click();

  // Сразу — в объединённых новостях вместе с RSS-лентами.
  await expect(page).toHaveURL('/rss?saved=news');
  await expect(
    page.getByRole('region', { name: 'Новости сайта и подключённых RSS-лент' }).getByText(title),
  ).toBeVisible();

  // Убираем за собой.
  await page.goto('/admin/news');
  await page
    .getByRole('row')
    .filter({ hasText: title })
    .getByRole('button', { name: 'Удалить' })
    .click();
  await page
    .getByRole('dialog', { name: 'Удалить новость?' })
    .getByRole('button', { name: 'Удалить' })
    .click();
  await expect(page).toHaveURL('/admin/news?deleted=1');
});
