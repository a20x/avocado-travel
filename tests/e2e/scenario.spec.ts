import { expect, test } from '@playwright/test';
import {
  choosePhrase,
  expectNoHorizontalScroll,
  expectValidHtml,
  fillRegistration,
  freeSeats,
  openFirstFlight,
  payByCard,
  seatCheckbox,
  selectSeats,
  uniqueEmail,
} from './helpers';
import { SEARCH_DATE } from './public-pages';

/**
 * Главный сценарий сайта целиком — шаг за шагом как в docs/02-product.md:
 * «Найти и забронировать билет» и «Отменить заказ».
 */
test('поиск → бронь → оплата → кабинет → отмена', async ({ page }, testInfo) => {
  // У двух экранов разные направления: тесты идут параллельно и не должны бороться за места.
  const to =
    testInfo.project.name === 'mobile'
      ? { slug: 'sochi', city: 'Сочи' }
      : { slug: 'kazan', city: 'Казань' };

  // 1. Гость на главной заполняет фразу: «Я лечу из Москвы в … , нас 2, класс эконом».
  await page.goto('/');
  await choosePhrase(page, 'from', 'moscow');
  await choosePhrase(page, 'to', to.slug);
  await page.getByLabel('Дата вылета').fill(SEARCH_DATE);
  await choosePhrase(page, 'passengers', '2');
  await choosePhrase(page, 'cabinClass', 'economy');
  await page.getByRole('button', { name: 'Подобрать рейсы' }).click();

  // 2. Видит список рейсов на эту дату, может сортировать.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`Москва → ${to.city}`);
  await page.getByRole('link', { name: 'ранние' }).click();
  await expect(page).toHaveURL(/sort=departure/);

  // 3. Открывает рейс, выбирает два свободных места на схеме салона.
  const flightUrl = await openFirstFlight(page);
  const seats = await freeSeats(page, 2);
  await selectSeats(page, seats);

  // 4. Нажимает «Перейти к оформлению». Не вошёл — регистрируется и возвращается к брони с местами.
  await page.getByRole('button', { name: 'Перейти к оформлению' }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fbooking/);
  await page.getByRole('link', { name: 'Зарегистрируйтесь' }).click();
  await fillRegistration(page, 'Вера', uniqueEmail(`vera-${testInfo.project.name}`));
  await expect(page).toHaveURL(/\/booking\?/);

  // 5. Вводит имена пассажиров, видит итоговую сумму.
  await expect(page.getByText(`Пассажир 1 · место ${seats[0]}`)).toBeVisible();
  await expect(page.getByText(`Пассажир 2 · место ${seats[1]}`)).toBeVisible();
  const total = await page
    .getByRole('complementary', { name: 'Итог брони' })
    .getByText(/₽$/)
    .last()
    .innerText();
  await page.getByLabel('Имя').nth(0).fill('Вера');
  await page.getByLabel('Фамилия').nth(0).fill('Лебедева');
  await page.getByLabel('Имя').nth(1).fill('Пётр');
  await page.getByLabel('Фамилия').nth(1).fill('Лебедев');
  await page.getByRole('button', { name: 'Перейти к оплате' }).click();

  // 6. Проходит демо-оплату, получает код брони из 6 символов.
  await expect(page.getByRole('button', { name: `Оплатить ${total}` })).toBeVisible();
  await payByCard(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Бронь оформлена' })).toBeVisible();
  const pnr = await page.getByText(/^[A-HJ-NP-Z2-9]{6}$/).innerText();

  // …и заказ появляется в личном кабинете.
  await page.getByRole('link', { name: 'Мои заказы' }).click();
  await expect(page).toHaveURL('/account');
  const order = page.getByRole('region', { name: `Москва → ${to.city}` }).filter({ hasText: pnr });
  await expect(order.getByText('Оплачен')).toBeVisible();
  await expect(order.getByText('Вера Лебедева')).toBeVisible();
  await expect(order.getByText('Пётр Лебедев')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectValidHtml(page, '/account');

  // Купленные места на схеме заняты.
  await page.goto(flightUrl);
  for (const seat of seats) await expect(seatCheckbox(page, seat)).toBeDisabled();

  // Отмена: 1–2. Покупатель открывает кабинет, нажимает «Отменить», подтверждает.
  await page.goto('/account');
  await order.getByRole('button', { name: 'Отменить бронь' }).click();
  await page
    .getByRole('dialog', { name: `Отменить бронь ${pnr}?` })
    .getByRole('button', { name: 'Отменить бронь' })
    .click();

  // 3. Заказ получает статус «Отменён», места освобождаются.
  await expect(order.getByText('Отменён')).toBeVisible();
  await page.goto(flightUrl);
  for (const seat of seats) await expect(seatCheckbox(page, seat)).toBeEnabled();
});
