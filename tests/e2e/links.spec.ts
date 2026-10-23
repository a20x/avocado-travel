import { expect, test } from '@playwright/test';
import { expectValidHtml, openAsAdmin } from './helpers';

test('посетитель видит каталог без скрытых разделов и ссылок', async ({ page }) => {
  await page.goto('/links');
  const toc = page.getByRole('navigation', { name: 'Разделы каталога' });
  await toc.getByRole('link', { name: 'Аэропорты' }).click();
  await expect(page).toHaveURL(/#catalog-\d+$/);

  // Подраздел внутри раздела.
  await expect(page.getByRole('heading', { level: 3, name: 'Документы и визы' })).toBeVisible();
  // Внешние ссылки — в новой вкладке.
  await expect(page.getByRole('link', { name: /^Шереметьево/ })).toHaveAttribute(
    'target',
    '_blank',
  );
  // Скрытые в демо-данных раздел и ссылка не видны.
  await expect(page.getByText('Партнёры (черновик)')).toHaveCount(0);
  await expect(page.getByText('Карты «Мир»')).toHaveCount(0);
});

test('администратор добавляет, скрывает и удаляет раздел со ссылкой', async ({
  page,
}, testInfo) => {
  const id = `${testInfo.project.name === 'mobile' ? 'm' : 'd'}${Date.now().toString(36)}`;
  const section = `Тест ${id}`;
  const link = `Сайт ${id}`;

  await openAsAdmin(page, '/admin/catalog');
  await expectValidHtml(page, '/admin/catalog');

  const sectionForm = page.getByRole('region', { name: 'Новый раздел' });
  await sectionForm.getByRole('button', { name: 'Добавить раздел' }).click();
  await expect(sectionForm.getByText('Название — от 2 символов')).toBeVisible();
  await sectionForm.getByLabel('Название раздела').fill(section);
  await sectionForm.getByRole('button', { name: 'Добавить раздел' }).click();
  await expect(page.getByRole('button', { name: `Скрыть раздел «${section}»` })).toBeVisible();

  const linkForm = page.getByRole('region', { name: 'Новая ссылка' });
  await linkForm.getByLabel('Раздел').selectOption({ label: section });
  await linkForm.getByLabel('Название ссылки').fill(link);
  await linkForm.getByLabel('Адрес').fill('example.net');
  await linkForm.getByRole('button', { name: 'Добавить ссылку' }).click();
  await expect(linkForm.getByText('Нужен адрес сайта: https://…')).toBeVisible();
  await linkForm.getByLabel('Адрес').fill(`https://example.net/${id}`);
  await linkForm.getByRole('button', { name: 'Добавить ссылку' }).click();
  await expect(page.getByRole('button', { name: `Скрыть ссылку «${link}»` })).toBeVisible();

  await page.goto('/links');
  await expect(page.getByRole('heading', { name: section })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(`^${link}`) })).toBeVisible();

  // Скрытый раздел не виден посетителям вместе со ссылкой.
  await page.goto('/admin/catalog');
  await page.getByRole('button', { name: `Скрыть раздел «${section}»` }).click();
  await expect(page.getByRole('button', { name: `Показать раздел «${section}»` })).toBeVisible();
  await page.goto('/links');
  await expect(page.getByRole('heading', { name: section })).toHaveCount(0);
  await expect(page.getByText(link)).toHaveCount(0);

  // Удаление — с подтверждением, вместе со ссылками.
  await page.goto('/admin/catalog');
  const block = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: `Показать раздел «${section}»` }) });
  await block.getByRole('button', { name: 'Удалить', exact: true }).first().click();
  await page
    .getByRole('dialog', { name: 'Удалить раздел?' })
    .getByRole('button', { name: 'Удалить' })
    .click();
  await expect(page.getByText(section)).toHaveCount(0);
});

test('каталог в админке скрыт от посетителей', async ({ page }) => {
  await page.goto('/admin/catalog');
  await expect(page).toHaveURL('/login?next=%2Fadmin%2Fcatalog');
});
