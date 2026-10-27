import { expect, test } from '@playwright/test';
import { expectValidHtml, openAsAdmin } from './helpers';

test('лента новостей: страницы, рубрики и сама новость', async ({ page }) => {
  await page.goto('/news');
  const items = page.getByRole('main').getByRole('article');
  await expect(items).toHaveCount(10);

  // Вторая страница — по ссылке в переключателе.
  await page
    .getByRole('navigation', { name: 'Страницы' })
    .getByRole('link', { name: 'Страница 2' })
    .click();
  await expect(page).toHaveURL('/news?page=2');
  await expect(items.first()).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Рубрики' })
    .getByRole('link', { name: 'Акции' })
    .click();
  await expect(page).toHaveURL('/news?category=promo');
  for (const badge of await items.getByText('Акции').all()) await expect(badge).toBeVisible();
  await expect(items).toHaveCount(3);

  await items.getByRole('link', { name: 'Кирра: багаж 23 кг уже в цене' }).click();
  await expect(page).toHaveURL('/news/kirra-bagazh-v-cene');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Кирра: багаж 23 кг уже в цене');
});

test('запланированная новость не видна до даты публикации', async ({ page }) => {
  const response = await page.goto('/news/novogodnie-kanikuly');
  expect(response?.status()).toBe(404);
  await page.goto('/news');
  await expect(page.getByText('Расписание на новогодние каникулы')).toHaveCount(0);
});

test('администратор пишет, правит и удаляет новость', async ({ page }, testInfo) => {
  const title = `Проверка ленты ${testInfo.project.name} ${Date.now()}`;

  await openAsAdmin(page, '/admin/news');
  await expectValidHtml(page, '/admin/news');
  await page.getByRole('link', { name: 'Написать новость' }).click();
  await expect(page).toHaveURL('/admin/news/new');
  await expectValidHtml(page, '/admin/news/new');

  // Пустая форма — ошибки у полей, а выбранная рубрика не сбрасывается.
  await page.getByLabel('Рубрика').selectOption('service');
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page.getByText('Заголовок — от 5 символов')).toBeVisible();
  await expect(page.getByLabel('Рубрика')).toHaveValue('service');

  await page.getByLabel('Заголовок').fill(title);
  await page.getByLabel('Кратко').fill('Короткое описание проверочной новости.');
  await page.getByLabel('Текст').fill('Первый абзац проверочной новости.\n\nВторой абзац.');
  await page.getByRole('button', { name: 'Опубликовать' }).click();

  await expect(page).toHaveURL(/\/admin\/news\?saved=/);
  await expect(page.getByRole('status').filter({ hasText: 'Новость сохранена' })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: title });
  await expect(row).toBeVisible();

  // Новость на сайте: адрес собран из заголовка, абзацы — отдельными параграфами.
  await row.getByRole('link', { name: title, exact: true }).click();
  await expect(page).toHaveURL(/\/news\/proverka-lenty-/);
  await expect(page.getByText('Второй абзац.')).toBeVisible();
  const publicUrl = page.url();

  await page.goto('/admin/news');
  await row.getByRole('link', { name: /^Изменить/ }).click();
  await expect(page.getByLabel('Заголовок')).toHaveValue(title);
  await page.getByLabel('Заголовок').fill(`${title} (исправлено)`);
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.getByRole('row').filter({ hasText: `${title} (исправлено)` })).toBeVisible();

  await page
    .getByRole('row')
    .filter({ hasText: title })
    .getByRole('button', { name: 'Удалить' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Удалить новость?' });
  await dialog.getByRole('button', { name: 'Удалить' }).click();
  await expect(page).toHaveURL('/admin/news?deleted=1');
  await expect(page.getByRole('row').filter({ hasText: title })).toHaveCount(0);
  expect((await page.goto(publicUrl))?.status()).toBe(404);
});

test('админка новостей закрыта от посетителей', async ({ request }) => {
  const response = await request.get('/admin/news/new', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain('/login?next=%2Fadmin%2Fnews%2Fnew');
});
