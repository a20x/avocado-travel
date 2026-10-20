import { expect, test } from '@playwright/test';
import { HtmlValidate, formatterFactory } from 'html-validate';

test('шапка и подвал есть на странице, главная подсвечена в меню', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(
    page.getByRole('contentinfo').getByRole('navigation', { name: 'Карта сайта' }),
  ).toBeVisible();

  if (testInfo.project.name === 'desktop') {
    const menu = page.getByRole('banner').getByRole('navigation', { name: 'Основное меню' });
    await expect(menu.getByRole('link', { name: 'Рейсы' })).toHaveAttribute('aria-current', 'page');
  }
});

test('на телефоне меню открывается кнопкой', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'кнопка меню есть только на узком экране');

  await page.goto('/');
  const forumLink = page.getByRole('banner').getByRole('link', { name: 'Форум' });
  await expect(forumLink).toBeHidden();

  await page.getByRole('banner').locator('summary[aria-label="Меню"]').click();
  await expect(forumLink).toBeVisible();
});

test('несуществующий адрес — страница 404 в стиле сайта', async ({ page, request }, testInfo) => {
  const response = await page.goto('/takoy-stranicy-net');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Страница не найдена' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();

  if (testInfo.project.name === 'desktop') {
    const html = await (await request.get('/takoy-stranicy-net')).text();
    const report = await new HtmlValidate({
      extends: ['html-validate:standard', 'html-validate:a11y'],
    }).validateString(html);
    expect(report.valid, formatterFactory('stylish')(report.results)).toBe(true);
  }
});
