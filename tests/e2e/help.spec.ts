import { expect, test } from '@playwright/test';

test('справка: оглавление ведёт к вопросу на этой же странице и обратно', async ({ page }) => {
  await page.goto('/help');
  const contents = page.getByRole('navigation', { name: 'Оглавление' });

  await contents.getByRole('link', { name: 'Сколько держится бронь без оплаты?' }).click();
  await expect(page).toHaveURL(/\/help#hold$/);
  const question = page.getByRole('article', { name: 'Сколько держится бронь без оплаты?' });
  await expect(question).toBeInViewport();
  await expect(question).toContainText('15 минут');

  await page
    .getByRole('region', { name: 'Бронирование и оплата' })
    .getByRole('link', { name: '↑ К оглавлению' })
    .click();
  await expect(page).toHaveURL(/\/help#contents$/);
  await expect(contents).toBeInViewport();
});

test('справка находится поиском по сайту и открывается на нужном разделе', async ({ page }) => {
  await page.goto('/search?q=отменить заказ');
  await page.getByRole('link', { name: /Справка: Личный кабинет и отмена/ }).click();
  await expect(page).toHaveURL(/\/help#account$/);
  await expect(page.getByRole('heading', { name: 'Как отменить заказ?' })).toBeInViewport();
});

test('на главной — содержание сайта, оттуда можно попасть в справку', async ({ page }) => {
  await page.goto('/');
  const contents = page.getByRole('navigation', { name: 'Содержание сайта' });
  for (const name of ['Направления', 'Сервисы', 'Форум', 'Справка']) {
    await expect(contents.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await contents.getByRole('link', { name: 'Справка', exact: true }).click();
  await expect(page).toHaveURL('/help');
  await expect(page.getByRole('heading', { level: 1, name: 'Справка' })).toBeVisible();
});
