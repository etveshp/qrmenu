import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSupabaseFake } from '../lib/__fixtures__/supabase-fake';
import type { FakeRow } from '../lib/__fixtures__/supabase-fake';

const mock = createSupabaseFake();
vi.mock('../lib/supabase/client', () => ({ supabase: mock.supabase }));

const { QRMenuProvider } = await import('../lib/store');
const { default: CustomerMenu } = await import('./CustomerMenu');

const seed = () => {
  mock.state.db.categories.push({
    id: 'cat-1', name_ua: 'Піца', name_en: 'Pizza', name_hu: 'Pizza', icon: '🍕', position: 1,
  });
  mock.state.db.menu_items.push({
    id: 'dish-1', category_id: 'cat-1',
    name_ua: 'Піца Маргарита', name_en: 'Pizza Margherita', name_hu: 'Pizza Margherita',
    description_ua: 'Класична', description_en: 'Classic', description_hu: 'Klasszikus',
    ingredients_ua: 'Моцарела', ingredients_en: 'Mozzarella', ingredients_hu: 'Mozzarella',
    price: 195, image: '', is_available: true, position: 1,
  } as FakeRow);
};

const renderGuest = () => {
  render(
    <QRMenuProvider>
      <CustomerMenu />
    </QRMenuProvider>
  );
};

beforeEach(() => {
  mock.reset();
});

afterEach(() => {
  cleanup();
});

describe('CustomerMenu', () => {
  it('renders dishes loaded from Supabase', async () => {
    seed();
    renderGuest();
    expect(await screen.findByText('Піца Маргарита')).toBeInTheDocument();
  });

  it('adds a dish to the cart and places an order (order lands in DB)', async () => {
    const user = userEvent.setup();
    seed();
    renderGuest();
    await screen.findByText('Піца Маргарита');

    // Add 1 pc and confirm
    await user.click(screen.getByTitle('Додати до замовлення'));
    await user.click(screen.getByTitle('Підтвердити'));

    // Cart trigger appears; open the drawer
    await user.click(await screen.findByRole('button', { name: /Ваше замовлення/i }));
    expect(screen.getAllByText('195 ₴').length).toBeGreaterThan(0);

    // Checkout
    await user.click(screen.getByRole('button', { name: /Надіслати замовлення до кухні/i }));

    // Success modal with a short id
    expect(await screen.findByText('Дякуємо за замовлення!')).toBeInTheDocument();
    expect(screen.getByText(/^ID: [0-9A-F]{8}$/)).toBeInTheDocument();

    // Order persisted (anon insert) with computed total and item snapshot
    expect(mock.state.db.orders).toHaveLength(1);
    expect(mock.state.db.orders[0]).toMatchObject({
      status: 'new',
      total_price: 195,
      table_id: null,
    });
    expect(mock.state.db.order_items).toHaveLength(1);
    expect(mock.state.db.order_items[0]).toMatchObject({
      menu_item_id: 'dish-1',
      quantity: 1,
      price: 195,
      name_ua: 'Піца Маргарита',
    });
  });

  it('shows the table label in the order when arriving with ?table=3', async () => {
    const user = userEvent.setup();
    seed();
    mock.state.db.tables.push({ id: 't-3', label: '3' });
    // Simulate the URL query
    vi.stubGlobal('location', { ...window.location, search: '?table=3' });
    try {
      renderGuest();
      await screen.findByText('Піца Маргарита');

      await user.click(screen.getByTitle('Додати до замовлення'));
      await user.click(screen.getByTitle('Підтвердити'));
      await user.click(await screen.findByRole('button', { name: /Ваше замовлення/i }));
      await user.click(screen.getByRole('button', { name: /Надіслати замовлення до кухні/i }));
      await screen.findByText('Дякуємо за замовлення!');

      expect(mock.state.db.orders[0].table_id).toBe('t-3');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
