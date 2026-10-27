import { expect, test } from '@playwright/test';
import { HtmlValidate, formatterFactory } from 'html-validate';
import { HTML_VALIDATE_CONFIG } from './helpers';

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

  // После выбора страницы меню закрывается само — шапка при переходе не перерисовывается.
  await forumLink.click();
  await expect(page).toHaveURL('/forum');
  await expect(forumLink).toBeHidden();
});

test('меню «Ещё» открывается при наведении и закрывается, когда мышь ушла', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'выпадающее «Ещё» есть только на широком экране');

  await page.goto('/');
  const menu = page.getByRole('banner').getByRole('navigation', { name: 'Основное меню' });
  const more = menu.getByText('Ещё');
  const forumLink = menu.getByRole('link', { name: 'Форум' });
  await expect(forumLink).toBeHidden();

  await more.hover();
  await expect(forumLink).toBeVisible();
  // Щелчок по «Ещё», пока мышь над ним, не закрывает открытое меню.
  await more.click();
  await expect(forumLink).toBeVisible();
  // Путь от кнопки к списку меню не закрывает.
  await forumLink.hover();
  await expect(forumLink).toBeVisible();

  await page.mouse.move(10, 500);
  await expect(forumLink).toBeHidden();

  // С клавиатуры: Enter открывает, Escape закрывает.
  await more.focus();
  await page.keyboard.press('Enter');
  await expect(forumLink).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(forumLink).toBeHidden();
});

test('несуществующий адрес — страница 404 в стиле сайта', async ({ page, request }, testInfo) => {
  const response = await page.goto('/takoy-stranicy-net');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Страница не найдена' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();

  if (testInfo.project.name === 'desktop') {
    const html = await (await request.get('/takoy-stranicy-net')).text();
    const report = await new HtmlValidate(HTML_VALIDATE_CONFIG).validateString(html);
    expect(report.valid, formatterFactory('stylish')(report.results)).toBe(true);
  }
});
