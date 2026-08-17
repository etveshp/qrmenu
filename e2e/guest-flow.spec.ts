import { test, expect } from '@playwright/test';

const MOCK = 'http://localhost:54321';

test.beforeEach(async ({ request }) => {
  // Wipe orders recorded by the fake Supabase so each test starts clean.
  await request.post(`${MOCK}/__state/reset`);
});

test('guest browses the menu, adds a dish to the cart and places an order', async ({ page, request }) => {
  await page.goto('/');

  // Category tiles render from the fake Supabase
  await expect(page.getByRole('button', { name: 'Піца' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Бургери' })).toBeVisible();

  // Open a category; quantity stepper defaults to 0
  await page.getByRole('button', { name: 'Піца' }).click();
  await expect(page.getByRole('heading', { name: 'Піца Маргарита' })).toBeVisible();
  const qty = page.getByTestId('qty-20000000-0000-4000-8000-000000000001');
  await expect(qty).toHaveText('0');

  // Stepper selects the quantity only — the cart stays empty until the round "+" is pressed
  await page.getByRole('button', { name: 'Додати', exact: true }).click();
  await expect(qty).toHaveText('1');
  await expect(page.getByRole('button', { name: /ваше замовлення/i })).toHaveCount(0);

  // The round "+" is the only control that adds to the cart
  await page.getByRole('button', { name: 'Додати до замовлення' }).click();
  // The stepper keeps showing the ordered quantity instead of resetting to 0
  await expect(qty).toHaveText('1');

  // Cart bar reflects the item and total
  const cartBar = page.getByRole('button', { name: /ваше замовлення/i });
  await expect(cartBar).toBeVisible();
  await expect(cartBar).toContainText('195');

  // Open the cart, add a note and send the order
  await cartBar.click();
  await expect(page.getByRole('heading', { name: 'Ваше замовлення' })).toBeVisible();
  await page.getByPlaceholder(/Наприклад: без цибулі/).fill('Тестове замовлення e2e');
  await page.getByRole('button', { name: 'Надіслати замовлення до кухні' }).click();

  // Success screen
  await expect(page.getByRole('heading', { name: 'Дякуємо за замовлення!' })).toBeVisible();

  // The order really landed in the fake Supabase with the right payload
  const res = await request.get(`${MOCK}/__state/orders`);
  expect(res.ok()).toBeTruthy();
  const orders = (await res.json()) as Array<{
    total_price: number;
    notes: string;
    items: Array<{ name_ua: string; quantity: number; price: number }>;
  }>;
  expect(orders).toHaveLength(1);
  expect(orders[0].total_price).toBe(195);
  expect(orders[0].notes).toBe('Тестове замовлення e2e');
  expect(orders[0].items).toHaveLength(1);
  expect(orders[0].items[0].name_ua).toBe('Піца Маргарита');
  expect(orders[0].items[0].quantity).toBe(1);
  expect(orders[0].items[0].price).toBe(195);
});

test('welcome message shows the table when arriving via ?table=3', async ({ page }) => {
  await page.goto('/?table=3');

  await expect(page.getByText('Ваш столик')).toBeVisible();
  // The table number appears right after "Ваш столик" in the welcome block
  await expect(page.getByText('Ваш столик').locator('..')).toContainText('3');
});

test('search filters dishes by name', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder(/Пошук страв/).fill('маргарита');

  await expect(page.getByRole('heading', { name: 'Піца Маргарита' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Бургер Фірмовий з беконом' })).not.toBeVisible();
});
