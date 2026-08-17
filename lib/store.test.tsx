import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act, waitFor, cleanup } from '@testing-library/react';
import { useEffect } from 'react';
import { createSupabaseFake } from './__fixtures__/supabase-fake';
import type { FakeRow } from './__fixtures__/supabase-fake';
import type { OrderItem } from './store';

// In-memory fake replaces lib/supabase/client. The factory is lazy, so it
// only runs when './store' is imported — which happens AFTER the fake is
// created below (value imports are dynamic to avoid the hoisting trap).
const mock = createSupabaseFake();
vi.mock('./supabase/client', () => ({ supabase: mock.supabase }));
vi.mock('qrcode', () => ({ default: { toDataURL: async () => 'data:image/png;base64,QUJD' } }));

const { QRMenuProvider, useQRMenu } = await import('./store');

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

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
  mock.reset();
  localStorage.clear();
});

const dishRow = (overrides: Partial<FakeRow> = {}): FakeRow => ({
  id: 'dish-1',
  category_id: 'cat-1',
  name_ua: 'Піца Маргарита',
  name_en: 'Pizza Margherita',
  name_hu: 'Pizza Margherita',
  description_ua: '',
  description_en: '',
  description_hu: '',
  ingredients_ua: '',
  ingredients_en: '',
  ingredients_hu: '',
  price: 195,
  image: '',
  is_available: true,
  position: 1,
  ...overrides,
});

const orderItems: OrderItem[] = [
  { menuItemId: 'dish-1', nameUa: 'Піца', nameEn: 'Pizza', nameHu: 'Pizza', quantity: 2, price: 195 },
  { menuItemId: 'dish-6', nameUa: 'Капучино', nameEn: 'Cappuccino', nameHu: 'Cappuccino', quantity: 1, price: 65 },
];

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Menu data loading + CRUD
// ---------------------------------------------------------------------------

describe('menu data loading', () => {
  it('loads categories, menu items and table labels from Supabase', async () => {
    mock.state.db.categories.push({
      id: 'cat-1', name_ua: 'Піца', name_en: 'Pizza', name_hu: 'Pizza', icon: '🍕', position: 1,
    });
    mock.state.db.menu_items.push(dishRow());
    mock.state.db.tables.push({ id: 't-1', label: '3' }, { id: 't-2', label: '10' });

    renderStore();
    await waitFor(() => expect(store.menuItems).toHaveLength(1));

    expect(store.categories[0]).toMatchObject({ id: 'cat-1', nameUa: 'Піца', icon: '🍕' });
    expect(store.menuItems[0]).toMatchObject({
      nameUa: 'Піца Маргарита',
      price: 195,
      category: 'cat-1',
      isAvailable: true,
    });
    // numeric sort of labels
    expect(store.tables.map((t) => t.label)).toEqual(['3', '10']);
    expect(store.isLoading).toBe(false);
  });
});

describe('menu items CRUD', () => {
  it('adds a menu item to the DB and local state', async () => {
    renderStore();
    await act(async () => {
      await store.addMenuItem({
        nameUa: 'Борщ', nameEn: 'Borscht', nameHu: 'Borscs',
        descriptionUa: '', descriptionEn: '', descriptionHu: '',
        ingredientsUa: '', ingredientsEn: '', ingredientsHu: '',
        price: 120, category: 'cat-soups', image: '', isAvailable: true,
      });
    });
    expect(store.menuItems).toHaveLength(1);
    expect(mock.state.db.menu_items).toHaveLength(1);
    expect(mock.state.db.menu_items[0]).toMatchObject({ name_ua: 'Борщ', category_id: 'cat-soups', price: 120 });
  });

  it('updates a menu item partially (DB + state)', async () => {
    mock.state.db.menu_items.push(dishRow());
    renderStore();
    await waitFor(() => expect(store.menuItems).toHaveLength(1));

    await act(async () => {
      await store.updateMenuItem('dish-1', { price: 999, isAvailable: false });
    });
    expect(store.menuItems[0].price).toBe(999);
    expect(store.menuItems[0].isAvailable).toBe(false);
    expect(mock.state.db.menu_items[0]).toMatchObject({ price: 999, is_available: false });
  });

  it('deletes a menu item', async () => {
    mock.state.db.menu_items.push(dishRow());
    renderStore();
    await waitFor(() => expect(store.menuItems).toHaveLength(1));

    await act(async () => {
      await store.deleteMenuItem('dish-1');
    });
    expect(store.menuItems).toHaveLength(0);
    expect(mock.state.db.menu_items).toHaveLength(0);
  });
});

describe('categories CRUD', () => {
  it('adds, updates and deletes a category', async () => {
    renderStore();
    await act(async () => {
      await store.addCategory({ nameUa: 'Сніданки', nameEn: 'Breakfasts', nameHu: 'Reggelik', icon: '🍳' });
    });
    expect(store.categories).toHaveLength(1);
    expect(mock.state.db.categories[0]).toMatchObject({ name_en: 'Breakfasts' });

    const id = store.categories[0].id;
    await act(async () => {
      await store.updateCategory(id, { nameEn: 'Renamed' });
    });
    expect(store.categories[0].nameEn).toBe('Renamed');
    expect(mock.state.db.categories[0].name_en).toBe('Renamed');

    await act(async () => {
      await store.deleteCategory(id);
    });
    expect(store.categories).toHaveLength(0);
    expect(mock.state.db.categories).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

describe('orders', () => {
  it('creates an order as a guest: uuid, computed total, items snapshot', async () => {
    mock.state.db.tables.push({ id: 't-3', label: '3' });
    renderStore();
    await waitFor(() => expect(store.tables.map((t) => t.label)).toEqual(['3']));

    let id = '';
    await act(async () => {
      id = await store.createOrder('3', orderItems);
    });

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(mock.state.db.orders).toHaveLength(1);
    expect(mock.state.db.orders[0]).toMatchObject({
      id,
      table_id: 't-3',
      status: 'new',
      total_price: 455,
    });
    expect(mock.state.db.order_items).toHaveLength(2);
    expect(mock.state.db.order_items[0]).toMatchObject({ order_id: id, menu_item_id: 'dish-1', quantity: 2, price: 195 });

    expect(store.orders[0]).toMatchObject({ id, tableId: '3', status: 'new', totalPrice: 455 });
  });

  it('falls back to null table_id for unknown table labels', async () => {
    renderStore();
    await act(async () => {
      await store.createOrder('VIP-99', orderItems);
    });
    expect(mock.state.db.orders[0].table_id).toBeNull();
    expect(store.orders[0].tableId).toBe('VIP-99');
  });

  it('stores optional notes', async () => {
    renderStore();
    await act(async () => {
      await store.createOrder('1', orderItems, 'без цибулі');
    });
    expect(mock.state.db.orders[0].notes).toBe('без цибулі');
  });

  it('updates order status and deletes an order', async () => {
    renderStore();
    let id = '';
    await act(async () => {
      id = await store.createOrder('1', orderItems);
    });

    await act(async () => {
      await store.updateOrderStatus(id, 'preparing');
    });
    expect(store.orders[0].status).toBe('preparing');
    expect(mock.state.db.orders[0].status).toBe('preparing');

    await act(async () => {
      await store.deleteOrder(id);
    });
    expect(store.orders).toHaveLength(0);
    expect(mock.state.db.orders).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Owner auth
// ---------------------------------------------------------------------------

describe('owner auth', () => {
  it('loads orders (with table labels and items) when a session exists', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    mock.state.db.tables.push({ id: 't-3', label: '3' });
    mock.state.db.orders.push({
      id: 'o-1', table_id: 't-3', status: 'new', notes: null,
      total_price: 100, created_at: '2026-08-11T00:00:00Z',
    });
    mock.state.db.order_items.push({
      id: 'oi-1', order_id: 'o-1', menu_item_id: 'dish-1',
      name_ua: 'Піца', name_en: 'Pizza', name_hu: 'Pizza', price: 100, quantity: 1,
    });

    renderStore();
    await waitFor(() => expect(store.orders).toHaveLength(1));

    expect(store.isOwner).toBe(true);
    expect(store.ownerEmail).toBe('owner@cafe.com');
    expect(store.orders[0]).toMatchObject({ id: 'o-1', tableId: '3', status: 'new', totalPrice: 100 });
    expect(store.orders[0].items[0]).toMatchObject({ menuItemId: 'dish-1', nameEn: 'Pizza', quantity: 1 });
  });

  it('signIn: wrong password returns an error, valid credentials set owner state', async () => {
    renderStore();
    let res: { error: string | null } | undefined;
    await act(async () => {
      res = await store.signIn('owner@cafe.com', 'wrong-password');
    });
    expect(res?.error).toBeTruthy();
    expect(store.isOwner).toBe(false);

    await act(async () => {
      res = await store.signIn('owner@cafe.com', 'correct-password');
    });
    expect(res?.error).toBeNull();
    await waitFor(() => expect(store.isOwner).toBe(true));
    expect(store.ownerEmail).toBe('owner@cafe.com');
  });

  it('signOut clears owner state and orders', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderStore();
    await waitFor(() => expect(store.isOwner).toBe(true));

    await act(async () => {
      await store.signOut();
    });
    await waitFor(() => expect(store.isOwner).toBe(false));
    expect(store.orders).toHaveLength(0);
  });

  it('changePassword: reports errors and succeeds for valid passwords', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderStore();

    let res: { error: string | null } | undefined;
    await act(async () => {
      res = await store.changePassword('short');
    });
    expect(res?.error).toBeTruthy();

    await act(async () => {
      res = await store.changePassword('new-secure-password');
    });
    expect(res?.error).toBeNull();
  });

  it('persists the sound preference to the DB and restores it on remount', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderStore();
    await waitFor(() => expect(store.isOwner).toBe(true));
    expect(store.soundEnabled).toBe(true);

    // Toggle off -> written to the settings table
    await act(async () => {
      store.setSoundEnabled(false);
    });
    await waitFor(() => {
      const rows = mock.state.db.settings as { key: string; value: { sound_enabled: boolean } }[];
      expect(rows.find((r) => r.key === 'owner')?.value.sound_enabled).toBe(false);
    });

    // A fresh provider (e.g. after navigating to another page) restores it
    cleanup();
    renderStore();
    await waitFor(() => expect(store.isOwner).toBe(true));
    await waitFor(() => expect(store.soundEnabled).toBe(false));
  });

  it('uploads a café photo: file to storage, path to settings, exposes the public URL', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderStore();
    await waitFor(() => expect(store.isOwner).toBe(true));

    const file = new File(['cafe-image-bytes'], 'cafe.jpg', { type: 'image/jpeg' });
    await act(async () => {
      await store.uploadCafePhoto(file);
    });

    // Path saved under settings key 'cafe' (unique per upload)
    const rows = mock.state.db.settings as { key: string; value: { photo_path?: string } }[];
    const photoPath = rows.find((r) => r.key === 'cafe')?.value.photo_path;
    expect(photoPath).toMatch(/^cafe-photo-/);
    // Public URL exposed for the banner
    expect(store.cafePhotoUrl).toContain(photoPath ?? '');

    // A fresh provider loads it back from the DB
    cleanup();
    renderStore();
    await waitFor(() => expect(store.cafePhotoUrl).toContain('cafe-photos'));
  });

  it('cache-busts the photo URL when the photo is replaced', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderStore();
    await waitFor(() => expect(store.isOwner).toBe(true));

    const file = new File(['cafe-image-bytes'], 'cafe.jpg', { type: 'image/jpeg' });
    await act(async () => {
      await store.uploadCafePhoto(file);
    });
    const firstUrl = store.cafePhotoUrl;
    expect(firstUrl).toContain('?v=');

    // Replace the photo — the URL must change so the browser bypasses the cache
    await act(async () => {
      await store.uploadCafePhoto(file);
    });
    expect(store.cafePhotoUrl).not.toBe(firstUrl);
    expect(store.cafePhotoUrl).toMatch(/\?v=\d+$/);
  });

  it('gives each photo upload a unique object path and removes the previous one', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderStore();
    await waitFor(() => expect(store.isOwner).toBe(true));

    const file = new File(['cafe-image-bytes'], 'cafe.jpg', { type: 'image/jpeg' });
    await act(async () => {
      await store.uploadCafePhoto(file);
    });
    const filesAfterFirst = [...(mock.state.storageFiles['cafe-photos'] ?? [])];
    expect(filesAfterFirst).toHaveLength(1);
    expect(filesAfterFirst[0]).toMatch(/^cafe-photo-/);

    // Second and third uploads: each gets a unique object, all stale objects are
    // cleaned up — exactly one file remains in the bucket
    await act(async () => {
      await store.uploadCafePhoto(file);
    });
    await act(async () => {
      await store.uploadCafePhoto(file);
    });
    const filesAfterThird = mock.state.storageFiles['cafe-photos'] ?? [];
    expect(filesAfterThird).toHaveLength(1);
    expect(filesAfterThird[0]).toMatch(/^cafe-photo-/);
    expect(filesAfterThird[0]).not.toBe(filesAfterFirst[0]);

    // The stored path matches the surviving object
    const rows = mock.state.db.settings as { key: string; value: { photo_path?: string } }[];
    expect(rows.find((r) => r.key === 'cafe')?.value.photo_path).toBe(filesAfterThird[0]);
  });

  it('saves trilingual café name/description, keeps the photo path, restores on remount', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderStore();
    await waitFor(() => expect(store.isOwner).toBe(true));

    // Upload a photo first, then save trilingual name/description
    await act(async () => {
      await store.uploadCafePhoto(new File(['x'], 'cafe.jpg', { type: 'image/jpeg' }));
      await store.saveCafeInfo({
        name_ua: 'Світ кави',
        name_en: 'Coffee World',
        name_hu: 'Kávé Világ',
        description_ua: 'Затишна кав\'ярня',
        description_en: 'A cozy coffee shop',
        description_hu: 'Hangulatos kávézó',
      });
    });

    expect(store.cafeNames.ua).toBe('Світ кави');
    expect(store.cafeNames.en).toBe('Coffee World');
    expect(store.cafeNames.hu).toBe('Kávé Világ');
    expect(store.cafeDescriptions.ua).toBe('Затишна кав\'ярня');
    expect(store.cafeDescriptions.en).toBe('A cozy coffee shop');

    // DB row keeps both the photo path and the new fields
    const rows = mock.state.db.settings as { key: string; value: { photo_path?: string; name_ua?: string; name_en?: string } }[];
    const cafeRow = rows.find((r) => r.key === 'cafe')?.value;
    expect(cafeRow?.photo_path).toMatch(/^cafe-photo-/);
    expect(cafeRow?.name_ua).toBe('Світ кави');
    expect(cafeRow?.name_en).toBe('Coffee World');

    // A fresh provider restores name/description too
    cleanup();
    renderStore();
    await waitFor(() => expect(store.cafeNames.ua).toBe('Світ кави'));
    await waitFor(() => expect(store.cafeNames.en).toBe('Coffee World'));
    await waitFor(() => expect(store.cafeDescriptions.ua).toBe('Затишна кав\'ярня'));
  });

  it('deletes the café photo: removes the file reference and clears the URL', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderStore();
    await waitFor(() => expect(store.isOwner).toBe(true));

    await act(async () => {
      await store.uploadCafePhoto(new File(['x'], 'cafe.jpg', { type: 'image/jpeg' }));
    });
    expect(store.cafePhotoUrl).toContain('cafe-photos');

    await act(async () => {
      await store.deleteCafePhoto();
    });
    expect(store.cafePhotoUrl).toBe('');

    const rows = mock.state.db.settings as { key: string; value: { photo_path?: string } }[];
    expect(rows.find((r) => r.key === 'cafe')?.value.photo_path).toBeUndefined();
  });

  it('uploads a café logo (PNG/SVG): stores the path and exposes the URL', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderStore();
    await waitFor(() => expect(store.isOwner).toBe(true));

    await act(async () => {
      await store.uploadCafeLogo(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
    });

    const rows = mock.state.db.settings as { key: string; value: { logo_path?: string } }[];
    expect(rows.find((r) => r.key === 'cafe')?.value.logo_path).toMatch(/^cafe-logo-/);
    expect(store.cafeLogoUrl).toContain('cafe-photos');
  });

  it('saves and restores per-day working hours', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderStore();
    await waitFor(() => expect(store.isOwner).toBe(true));

    await act(async () => {
      await store.saveCafeInfo({ hours: { mon: '09:00 - 22:00', tue: '', sun: '10:00 - 18:00' } });
    });

    expect(store.cafeHours.mon).toBe('09:00 - 22:00');
    expect(store.cafeHours.tue).toBe('');
    expect(store.cafeHours.sun).toBe('10:00 - 18:00');

    // A fresh provider restores the hours
    cleanup();
    renderStore();
    await waitFor(() => expect(store.cafeHours.mon).toBe('09:00 - 22:00'));
  });
});

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

describe('tables', () => {
  it('adds tables with numeric sorting', async () => {
    renderStore();
    await act(async () => {
      await store.addTable('10');
    });
    await act(async () => {
      await store.addTable('VIP-1');
    });
    expect(store.tables.map((t) => t.label)).toEqual(['10', 'VIP-1']);
    expect(mock.state.db.tables).toHaveLength(2);
  });

  it('generates and stores a QR code for a new table (persisted in DB)', async () => {
    renderStore();
    await act(async () => {
      await store.addTable('7');
    });
    const added = store.tables.find((t) => t.label === '7');
    expect(added?.qrPath).toMatch(/^qr-.*\.png$/);
    // The path must survive a reload, i.e. be written to the tables row
    const dbRow = (mock.state.db.tables as FakeRow[]).find((t) => t.label === '7');
    expect(dbRow?.qr_path).toMatch(/^qr-.*\.png$/);
  });

  it('keeps unique table ids after add + delete (no duplicate React keys)', async () => {
    renderStore();
    await act(async () => {
      await store.addTable('A');
    });
    await act(async () => {
      await store.addTable('B');
    });
    const ids = store.tables.map((t) => t.id).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);

    await act(async () => {
      await store.deleteTable('A');
    });
    const remaining = store.tables.map((t) => t.id).filter(Boolean);
    expect(new Set(remaining).size).toBe(remaining.length);
    expect(store.tables.map((t) => t.label)).toEqual(['B']);
  });

  it('ignores duplicates and empty labels', async () => {
    renderStore();
    await act(async () => {
      await store.addTable('3');
    });
    await act(async () => {
      await store.addTable('3');
    });
    await act(async () => {
      await store.addTable('   ');
    });
    expect(store.tables.map((t) => t.label)).toEqual(['3']);
    expect(mock.state.db.tables).toHaveLength(1);
  });

  it('deletes a table', async () => {
    mock.state.db.tables.push({ id: 't-1', label: '3' });
    renderStore();
    await waitFor(() => expect(store.tables.map((t) => t.label)).toEqual(['3']));

    await act(async () => {
      await store.deleteTable('3');
    });
    expect(store.tables).toHaveLength(0);
    expect(mock.state.db.tables).toHaveLength(0);
  });
});
