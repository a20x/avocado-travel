import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { HtmlValidate, formatterFactory } from 'html-validate';

/**
 * Общие шаги сквозных тестов: регистрация, выбор мест, оплата, проверка HTML.
 * Тесты читаются как сценарий, а детали интерфейса живут здесь, в одном месте.
 */

// standard — правила валидности HTML (то, что проверяет валидатор W3C), a11y — базовая доступность.
const htmlValidate = new HtmlValidate({
  extends: ['html-validate:standard', 'html-validate:a11y'],
});
const formatReport = formatterFactory('stylish');

/**
 * HTML страницы валиден. Запрос идёт через `page.request` — с cookie браузера теста,
 * поэтому так проверяются и закрытые страницы (кабинет, бронь, админка).
 */
export async function expectValidHtml(source: Page | APIRequestContext, path: string) {
  const request = 'request' in source ? source.request : source;
  const response = await request.get(path);
  expect(response.status(), `статус ${path}`).toBe(200);
  const report = await htmlValidate.validateString(await response.text());
  expect(report.valid, formatReport(report.results)).toBe(true);
}

/** Страница не шире экрана: вбок прокручиваются только таблицы и схема салона внутри себя. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'страница шире экрана').toBeLessThanOrEqual(0);
}

/** Уникальная почта: тесты идут параллельно на двух экранах и повторно на той же базе. */
export function uniqueEmail(tag: string): string {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
}

/** Заполняет и отправляет форму регистрации на текущей странице. */
export async function fillRegistration(page: Page, name: string, email: string) {
  await page.getByLabel('Имя').fill(name);
  await page.getByLabel('Почта').fill(email);
  await page.getByLabel('Пароль').fill('test-password');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
}

/** Новый покупатель с пустым кабинетом. */
export async function registerCustomer(page: Page, name: string, tag: string) {
  await page.goto('/register');
  await fillRegistration(page, name, uniqueEmail(tag));
  await expect(page).toHaveURL('/account');
}

export async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Почта').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
}

/** Кресло на схеме салона по номеру: `seatCheckbox(page, '7D')`. */
export function seatCheckbox(page: Page, seat: string) {
  return page.getByRole('checkbox', { name: new RegExp(`^Место ${seat},`) });
}

/** Номера первых свободных кресел класса, выбранного на странице рейса. */
export async function freeSeats(page: Page, count: number): Promise<string[]> {
  const free = page
    .getByRole('checkbox', { name: /^Место \d+[A-K],/ })
    .and(page.locator(':enabled'));
  await expect(free.first()).toBeAttached();
  const seats: string[] = [];
  for (let i = 0; i < count; i++) seats.push((await free.nth(i).getAttribute('value')) ?? '');
  return seats;
}

/**
 * Отмечает кресла на схеме. Сам флажок визуально скрыт (на экране — нарисованное кресло),
 * поэтому щелчок — с force.
 */
export async function selectSeats(page: Page, seats: string[]) {
  for (const seat of seats) await seatCheckbox(page, seat).check({ force: true });
}

/** Открывает первый рейс в результатах поиска и возвращает его адрес. */
export async function openFirstFlight(page: Page): Promise<string> {
  await page.getByRole('link', { name: 'Выбрать места' }).first().click();
  await expect(page).toHaveURL(/\/flights\/[0-9a-f-]{36}/);
  return page.url();
}

/** Демо-оплата картой. По умолчанию — проверочный номер, проходящий алгоритм Луна. */
export async function payByCard(page: Page, number = '4242 4242 4242 4242') {
  await page.getByLabel('Номер карты').fill(number);
  await page.getByLabel('Срок действия').fill('12/30');
  await page.getByLabel('CVC').fill('123');
  await page.getByRole('button', { name: /^Оплатить/ }).click();
}
