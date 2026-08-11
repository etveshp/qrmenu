import { describe, it, expect, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { QRMenuProvider, useQRMenu } from './store';
import type { OrderItem } from './store';

type Store = ReturnType<typeof useQRMenu>;

let store: Store;

function Probe() {
  const ctx = useQRMenu();
  useEffect(() => {
    store = ctx;
  });
  return null;
}

function renderStore() {
  render(
    <QRMenuProvider>
      <Probe />
    </QRMenuProvider>
  );
  return store;
}

beforeEach(() => {
  localStorage.clear();
});

describe('translations (t)', () => {
  it('defaults to Ukrainian', () => {
    renderStore();
    expect(store.language).toBe('ua');
    expect(store.t('app.name')).toBe('QR-Меню Кафе');
  });

  it('switches language and translates accordingly', () => {
    renderStore();
    act(() => store.setLanguage('en'));
    expect(store.t('app.name')).toBe('QR Cafe Menu');

    act(() => store.setLanguage('hu'));
    expect(store.t('app.name')).toBe('QR Kávézó Menü');
  });

  it('returns the key itself for unknown keys', () => {
    renderStore();
    expect(store.t('no.such.key')).toBe('no.such.key');
  });

  it('persists the chosen language to localStorage', () => {
    renderStore();
    act(() => store.setLanguage('en'));
    expect(localStorage.getItem('qr_menu_lang')).toBe('en');
  });
});

describe('menu items CRUD', () => {
  it('adds a menu item with a generated id', () => {
    renderStore();
    const initial = store.menuItems.length;
    act(() =>
      store.addMenuItem({
        nameUa: 'Борщ',
        nameEn: 'Borscht',
        nameHu: 'Borscs',
        descriptionUa: '',
        descriptionEn: '',
        descriptionHu: '',
        ingredientsUa: '',
        ingredientsEn: '',
        ingredientsHu: '',
        price: 120,
        category: 'cat-soups',
        image: '',
        isAvailable: true,
      })
    );
    const added = store.menuItems.find((i) => i.nameUa === 'Борщ');
    expect(added).toBeDefined();
    expect(added!.id).toMatch(/^dish-/);
    expect(store.menuItems.length).toBe(initial + 1);
    expect(added!.price).toBe(120);
  });

  it('updates a menu item partially', () => {
    renderStore();
    const target = store.menuItems[0];
    act(() =>
      store.updateMenuItem(target.id, { price: 999, isAvailable: false })
    );
    const updated = store.menuItems.find((i) => i.id === target.id)!;
    expect(updated.price).toBe(999);
    expect(updated.isAvailable).toBe(false);
    expect(updated.nameUa).toBe(target.nameUa);
  });

  it('deletes a menu item', () => {
    renderStore();
    const target = store.menuItems[0];
    act(() => store.deleteMenuItem(target.id));
    expect(store.menuItems.some((i) => i.id === target.id)).toBe(false);
  });
});

describe('categories CRUD', () => {
  it('adds a category with a generated id', () => {
    renderStore();
    act(() =>
      store.addCategory({
        nameUa: 'Сніданки',
        nameEn: 'Breakfasts',
        nameHu: 'Reggelik',
        icon: '🍳',
      })
    );
    expect(store.categories.some((c) => c.nameEn === 'Breakfasts')).toBe(true);
    expect(store.categories.at(-1)!.id).toMatch(/^cat-/);
  });

  it('updates and deletes a category', () => {
    renderStore();
    const target = store.categories[0];
    act(() => store.updateCategory(target.id, { nameEn: 'Renamed' }));
    expect(store.categories.find((c) => c.id === target.id)!.nameEn).toBe(
      'Renamed'
    );
    act(() => store.deleteCategory(target.id));
    expect(store.categories.some((c) => c.id === target.id)).toBe(false);
  });
});

describe('orders', () => {
  const items: OrderItem[] = [
    { menuItemId: 'dish-1', nameUa: 'Піца', nameEn: 'Pizza', nameHu: 'Pizza', quantity: 2, price: 195 },
    { menuItemId: 'dish-6', nameUa: 'Капучино', nameEn: 'Cappuccino', nameHu: 'Cappuccino', quantity: 1, price: 65 },
  ];

  it('creates an order with computed total, status new and ISO timestamp', () => {
    renderStore();
    let id = '';
    act(() => {
      id = store.createOrder('3', items);
    });
    const order = store.orders.find((o) => o.id === id)!;
    expect(id).toMatch(/^order-/);
    expect(order.tableId).toBe('3');
    expect(order.status).toBe('new');
    expect(order.totalPrice).toBe(2 * 195 + 65); // 455
    expect(order.items).toHaveLength(2);
    expect(Number.isNaN(Date.parse(order.createdAt))).toBe(false);
  });

  it('stores optional notes and prepends the new order', () => {
    renderStore();
    act(() => store.createOrder('1', items));
    const firstId = store.orders[0].id;
    act(() => store.createOrder('2', items, 'без цибулі'));
    expect(store.orders).toHaveLength(2);
    expect(store.orders[0].tableId).toBe('2');
    expect(store.orders[0].notes).toBe('без цибулі');
    expect(store.orders[1].id).toBe(firstId);
  });

  it('updates order status', () => {
    renderStore();
    let id = '';
    act(() => {
      id = store.createOrder('1', items);
    });
    act(() => store.updateOrderStatus(id, 'preparing'));
    expect(store.orders.find((o) => o.id === id)!.status).toBe('preparing');
  });

  it('deletes an order', () => {
    renderStore();
    let id = '';
    act(() => {
      id = store.createOrder('1', items);
    });
    act(() => store.deleteOrder(id));
    expect(store.orders.some((o) => o.id === id)).toBe(false);
  });
});

describe('tables', () => {
  it('adds tables with numeric sorting', () => {
    renderStore();
    act(() => store.addTable('10'));
    expect(store.tables).toEqual(['1', '2', '3', '4', '5', '10']);
    act(() => store.addTable('VIP-1'));
    expect(store.tables).toContain('VIP-1');
  });

  it('ignores duplicates and empty names', () => {
    renderStore();
    const before = store.tables.length;
    act(() => store.addTable('3'));
    act(() => store.addTable(''));
    expect(store.tables.length).toBe(before);
  });

  it('deletes a table', () => {
    renderStore();
    act(() => store.deleteTable('3'));
    expect(store.tables).not.toContain('3');
  });
});

describe('localStorage persistence', () => {
  it('writes menu items, categories, orders and tables on change', () => {
    renderStore();
    act(() =>
      store.addMenuItem({
        nameUa: 'Чай',
        nameEn: 'Tea',
        nameHu: 'Tea',
        descriptionUa: '',
        descriptionEn: '',
        descriptionHu: '',
        ingredientsUa: '',
        ingredientsEn: '',
        ingredientsHu: '',
        price: 30,
        category: 'cat-drinks',
        image: '',
        isAvailable: true,
      })
    );
    act(() => store.createOrder('2', [
      { menuItemId: 'dish-1', nameUa: 'Піца', nameEn: 'Pizza', nameHu: 'Pizza', quantity: 1, price: 195 },
    ]));

    const storedItems = JSON.parse(localStorage.getItem('qr_menu_items')!);
    const storedOrders = JSON.parse(localStorage.getItem('qr_menu_orders')!);
    expect(storedItems.some((i: { nameUa: string }) => i.nameUa === 'Чай')).toBe(true);
    expect(storedOrders).toHaveLength(1);
    expect(localStorage.getItem('qr_menu_categories')).not.toBeNull();
    expect(localStorage.getItem('qr_menu_tables')).not.toBeNull();
  });

  it('hydrates initial state from localStorage', () => {
    const seeded = [
      {
        id: 'dish-seed',
        nameUa: 'З сіда',
        nameEn: 'Seeded',
        nameHu: 'Seed',
        descriptionUa: '',
        descriptionEn: '',
        descriptionHu: '',
        ingredientsUa: '',
        ingredientsEn: '',
        ingredientsHu: '',
        price: 1,
        category: 'cat-drinks',
        image: '',
        isAvailable: true,
      },
    ];
    localStorage.setItem('qr_menu_items', JSON.stringify(seeded));

    renderStore();
    expect(store.menuItems).toEqual(seeded);
  });
});

describe('cross-tab sync', () => {
  it('updates state when another tab writes localStorage', async () => {
    renderStore();
    const incoming = [
      {
        id: 'dish-other-tab',
        nameUa: 'Інша вкладка',
        nameEn: 'Other tab',
        nameHu: 'Másik lap',
        descriptionUa: '',
        descriptionEn: '',
        descriptionHu: '',
        ingredientsUa: '',
        ingredientsEn: '',
        ingredientsHu: '',
        price: 1,
        category: 'cat-drinks',
        image: '',
        isAvailable: true,
      },
    ];
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'qr_menu_items',
          newValue: JSON.stringify(incoming),
        })
      );
    });
    await waitFor(() => expect(store.menuItems).toEqual(incoming));
  });
});
