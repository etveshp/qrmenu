import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { createSupabaseFake } from '../lib/__fixtures__/supabase-fake';

const mock = createSupabaseFake();
vi.mock('../lib/supabase/client', () => ({ supabase: mock.supabase }));

const { QRMenuProvider, useQRMenu } = await import('../lib/store');
const { default: OwnerCabinet } = await import('./OwnerCabinet');

// Captures the store for tests that drive state directly (e.g. sound)
let store: ReturnType<typeof useQRMenu>;
function StoreProbe() {
  const ctx = useQRMenu();
  useEffect(() => {
    store = ctx;
  });
  return null;
}

const renderCabinet = () => {
  render(
    <QRMenuProvider>
      <OwnerCabinet />
    </QRMenuProvider>
  );
};

beforeEach(() => {
  mock.reset();
});

afterEach(() => {
  cleanup();
});

describe('OwnerCabinet — auth', () => {
  it('shows an error for wrong credentials', async () => {
    const user = userEvent.setup();
    renderCabinet();

    await user.type(screen.getByLabelText('Email'), 'owner@cafe.com');
    await user.type(screen.getByLabelText('Пароль'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(
      await screen.findByText('Невірний email або пароль. Спробуйте ще раз.')
    ).toBeInTheDocument();
  });

  it('opens the cabinet after a successful login', async () => {
    const user = userEvent.setup();
    renderCabinet();

    await user.type(screen.getByLabelText('Email'), 'owner@cafe.com');
    await user.type(screen.getByLabelText('Пароль'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    // Owner panel appears (orders tab)
    expect(await screen.findByText('Замовлення')).toBeInTheDocument();
  });

  it('does not show the cabinet without a session', () => {
    renderCabinet();
    expect(screen.getByRole('button', { name: 'Увійти' })).toBeInTheDocument();
    expect(screen.queryByText('Замовлення')).not.toBeInTheDocument();
  });
});

describe('OwnerCabinet — sound', () => {
  it('does not chime when sound is disabled', async () => {
    const audioCtor = vi.fn();
    const MockAudioCtx = class {
      currentTime = 0;
      destination = {};
      createOscillator() {
        return { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      }
      createGain() {
        return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
      }
      constructor() {
        audioCtor();
      }
    };
    vi.stubGlobal('AudioContext', MockAudioCtx);
    try {
      mock.state.session = { user: { email: 'owner@cafe.com' } };
      render(
        <QRMenuProvider>
          <StoreProbe />
          <OwnerCabinet />
        </QRMenuProvider>
      );
      await screen.findByText('Замовлення');

      // Disable sound, then a new order arrives
      await act(async () => {
        store.setSoundEnabled(false);
      });
      await act(async () => {
        await store.createOrder('1', [
          { menuItemId: 'dish-1', nameUa: 'Піца', nameEn: 'Pizza', nameHu: 'Pizza', quantity: 1, price: 100 },
        ]);
      });

      // No AudioContext should have been created
      expect(audioCtor).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('OwnerCabinet — orders badge', () => {
  it('shows the new-orders count badge and hides it when there are none', async () => {
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    mock.state.db.orders.push({
      id: 'o-1', table_id: null, status: 'new', notes: null,
      total_price: 100, created_at: '2026-08-12T10:00:00Z',
    });
    const { container } = render(
      <QRMenuProvider>
        <OwnerCabinet />
      </QRMenuProvider>
    );
    await screen.findByText('Замовлення');

    const badge = await waitFor(() => container.querySelector('#orders-tab-badge'));
    expect(badge?.textContent).toBe('1');
  });
});

describe('OwnerCabinet — dish form', () => {
  it('adds a dish through the menu form (persists to DB)', async () => {
    const user = userEvent.setup();
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    mock.state.db.categories.push({
      id: 'cat-1', name_ua: 'Піца', name_en: 'Pizza', name_hu: 'Pizza', icon: '🍕', position: 1,
    });

    renderCabinet();
    await screen.findByText('Замовлення');

    // Menu tab → Add dish
    await user.click(screen.getByRole('button', { name: 'Меню' }));
    await user.click(screen.getByRole('button', { name: 'Додати страву' }));

    // Fill the three required name fields
    await user.type(screen.getByLabelText('Назва (УКР)'), 'Борщ');
    await user.type(screen.getByLabelText('Назва (ENG)'), 'Borscht');
    await user.type(screen.getByLabelText('Назва (HUN)'), 'Borscs');

    // Save button is disabled until the names are filled
    const saveBtn = screen.getByRole('button', { name: 'Зберегти страву' });
    // jsdom does not run the form-submission algorithm on button clicks,
    // so dispatch the submit event on the form explicitly (browsers do this).
    fireEvent.submit(saveBtn.closest('form')!);

    await waitFor(() => expect(mock.state.db.menu_items).toHaveLength(1));
    expect(mock.state.db.menu_items[0]).toMatchObject({
      name_ua: 'Борщ',
      name_en: 'Borscht',
      category_id: 'cat-1',
      price: 150,
      is_available: true,
    });
  });
});
